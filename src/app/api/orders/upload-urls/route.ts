import { NextResponse } from "next/server";
import { ORDER_SUBMITTER_ROLES, requireApiAuth } from "@/lib/auth";
import { staffDb } from "@/lib/db";
import { orders, users, brandDeliveryApps } from "@/lib/db/schema";
import { formatAmount } from "@/lib/orders/input";
import { staffRateLimits } from "@/lib/ratelimit";
import { getStorage, ORDER_IMAGE_MAX_BYTES, ORDER_IMAGE_UPLOAD_TTL_SECONDS, type UploadTarget } from "@/lib/storage";
import { ORDER_IMAGE_TYPES, orderImageKey, type OrderImageType } from "@/lib/storage/keys";
import { invalidField, ORDER_REQUEST_MAX_BYTES, savedByOtherAccount, uploadUrlsRequestSchema } from "@/lib/validations/orders";
import { eq, and, isNull, lt } from "drizzle-orm";
import { isUniqueViolation, orderError, queryCause, readJson } from "../respond";

const LOG = "[POST /api/orders/upload-urls]";
/** A colleague's upload that no phone has tried for this long is abandoned: it no longer holds its number. */
const ABANDONED_AFTER_MS = 2 * 60 * 60 * 1000;

const findOrder = (id: string) =>
  staffDb.query.orders.findFirst({
    where: eq(orders.id, id),
    columns: {
      id: true,
      brandId: true,
      branchId: true,
      submittedBy: true,
      orderNumber: true,
      deliveryAppId: true,
      confirmedAt: true,
      deletedAt: true,
    },
  });
type StoredOrder = NonNullable<Awaited<ReturnType<typeof findOrder>>>;

const duplicate = () => orderError("duplicate_order", "Order number already exists for this branch");

/**
 * The answer to a retry whose order is settled: the id is someone else's,
 * the order is done, or it was replaced. Undefined while it can be resumed.
 */
function settledAnswer(order: StoredOrder, brandId: string, userId: string) {
  if (order.brandId !== brandId || order.submittedBy !== userId) {
    return orderError("order_conflict", "Order id belongs to another submission");
  }
  // An earlier attempt finished but its answer never reached the phone.
  if (order.confirmedAt) {
    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber, alreadyConfirmed: true });
  }
  // A colleague took the number over while this upload was abandoned.
  if (order.deletedAt) {
    return orderError("duplicate_order", "Another submission of this order number replaced this one");
  }
  return undefined;
}

/** The photos of an order that storage doesn't have yet. */
async function missingPhotos(brandId: string, orderId: string) {
  const storage = getStorage();
  const present = await Promise.all(
    ORDER_IMAGE_TYPES.map((type) => storage.exists("orderImages", orderImageKey(brandId, orderId, type)))
  );
  return ORDER_IMAGE_TYPES.filter((_, i) => !present[i]);
}

async function signUploads(brandId: string, orderId: string, types: readonly OrderImageType[]) {
  const storage = getStorage();
  const targets = await Promise.all(
    types.map((type) =>
      storage.createUploadUrl("orderImages", orderImageKey(brandId, orderId, type), {
        contentType: "image/jpeg",
        maxBytes: ORDER_IMAGE_MAX_BYTES,
        expiresInSeconds: ORDER_IMAGE_UPLOAD_TTL_SECONDS,
      })
    )
  );
  return Object.fromEntries(types.map((type, i) => [type, targets[i]])) as Partial<Record<OrderImageType, UploadTarget>>;
}

/**
 * Step 1 of a staff order submission: creates the order, or resumes it, and
 * returns one signed upload URL per photo that storage doesn't have yet
 * (sealed, opened). The browser uploads directly to storage, then calls
 * /api/orders/[orderId]/confirm. Refusals carry the codes of
 * src/lib/orders/errors.ts, so the phone knows whether to try again.
 */
export async function POST(req: Request) {
  try {
    const session = await requireApiAuth(ORDER_SUBMITTER_ROLES);
    if (session instanceof Response) return session;
    const { userId: clerkUserId, brandId } = session;
    if (staffRateLimits.uploadUrls(clerkUserId)) {
      return orderError("rate_limited", "Too many requests; try again later");
    }

    if (!brandId) {
      return orderError("forbidden", "User has no brand");
    }

    const body = await readJson(req, ORDER_REQUEST_MAX_BYTES);
    // Branch phones are shared: an order saved under another account waits on the phone for its owner.
    if (savedByOtherAccount(body, clerkUserId)) {
      return orderError("other_account", "Order was saved under another account");
    }
    const parsed = uploadUrlsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return orderError("invalid_input", "Missing or invalid order details", invalidField(parsed.error));
    }
    const input = parsed.data;

    // 1. Resolve the staff member of this brand
    const user = await staffDb.query.users.findFirst({
      where: and(eq(users.clerkUserId, clerkUserId), eq(users.brandId, brandId), isNull(users.deletedAt)),
      columns: { id: true, branchId: true },
    });
    if (!user) {
      return orderError("forbidden", "Not a staff member of this brand");
    }

    // 2. A retry of a submission that already reached the server, known by
    //    the phone's id only: answer it if it is settled, or resume it below.
    //    It stays in the branch where it was captured, even if the worker
    //    was moved to another branch since.
    const prior = input.clientOrderId ? await findOrder(input.clientOrderId) : undefined;
    const settled = prior && settledAnswer(prior, brandId, user.id);
    if (settled) return settled;
    const branchId = prior?.branchId ?? user.branchId;
    if (!branchId) {
      return orderError("no_branch", "Staff user not assigned to a branch");
    }

    // 3. One of the brand's delivery apps, turned on. An order being resumed
    //    may keep the app it was captured with after the app was turned off.
    const app = await staffDb.query.brandDeliveryApps.findFirst({
      where: and(eq(brandDeliveryApps.id, input.deliveryAppId), eq(brandDeliveryApps.brandId, brandId)),
      columns: { id: true, isActive: true },
    });
    if (!app || (!app.isActive && app.id !== prior?.deliveryAppId)) {
      return orderError("app_unavailable", "Selected delivery app is not available for this brand");
    }

    // 4. One live order per branch, delivery app and number: any other
    //    submission of a taken number is refused. Only a colleague's upload
    //    that no phone has tried for a while gives its number up; it is taken
    //    over below.
    const now = new Date();
    const abandonedBefore = new Date(now.getTime() - ABANDONED_AFTER_MS);
    let abandoned: { id: string; updatedAt: Date } | undefined;
    if (!prior || prior.orderNumber !== input.orderNumber || prior.deliveryAppId !== app.id) {
      const holder = await staffDb.query.orders.findFirst({
        where: and(
          eq(orders.brandId, brandId),
          eq(orders.branchId, branchId),
          eq(orders.deliveryAppId, app.id),
          eq(orders.orderNumber, input.orderNumber),
          isNull(orders.deletedAt)
        ),
        columns: { id: true, submittedBy: true, confirmedAt: true, updatedAt: true },
      });
      if (holder) {
        const isAbandoned = !holder.confirmedAt && holder.submittedBy !== user.id && holder.updatedAt < abandonedBefore;
        if (!isAbandoned) return duplicate();
        abandoned = holder;
      }
    }

    // 5. Sign the upload URLs FIRST: if storage is misconfigured we surface
    //    the real error without leaving an orphan order behind. A resumed
    //    order may have a photo in storage already: the phone uploads only
    //    what is listed.
    const orderId = prior?.id ?? input.clientOrderId ?? crypto.randomUUID();
    const uploads = await signUploads(brandId, orderId, prior ? await missingPhotos(brandId, orderId) : ORDER_IMAGE_TYPES);

    // 6. Write the order only after signing succeeded. A retry stores what the
    //    worker may have corrected, and its updatedAt shows the order is still
    //    being tried.
    const fields = {
      orderNumber: input.orderNumber,
      deliveryAppId: app.id,
      subtotal: formatAmount(input.subtotal),
      notes: input.notes || null,
      updatedAt: now,
    };
    let refusal: Response | undefined;
    try {
      refusal = await staffDb.transaction(async (tx) => {
        if (prior) {
          // Locked, so neither the phone's own confirm nor a takeover lands in between.
          const [current] = await tx
            .select({ confirmedAt: orders.confirmedAt, deletedAt: orders.deletedAt })
            .from(orders)
            .where(eq(orders.id, prior.id))
            .for("update");
          const answer = settledAnswer({ ...prior, ...current }, brandId, user.id);
          if (answer) return answer;
        }
        if (abandoned) {
          // Only while it is still unconfirmed and untried.
          const freed = await tx
            .update(orders)
            .set({ deletedAt: now, updatedAt: now })
            .where(
              and(
                eq(orders.id, abandoned.id),
                isNull(orders.deletedAt),
                isNull(orders.confirmedAt),
                lt(orders.updatedAt, abandonedBefore)
              )
            )
            .returning({ id: orders.id });
          if (freed.length === 0) return duplicate();
        }
        if (prior) {
          await tx.update(orders).set(fields).where(eq(orders.id, prior.id));
        } else {
          await tx.insert(orders).values({ id: orderId, brandId, branchId, submittedBy: user.id, status: "needs_review", ...fields });
        }
        return undefined;
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // The same submission sent twice at once (two tabs, or a retry that
      // overlapped a slow attempt) created the row first: resume it.
      // Otherwise another order took the number in the meantime.
      const raced = prior ? undefined : await findOrder(orderId);
      if (!raced) return duplicate();
      return settledAnswer(raced, brandId, user.id) ?? NextResponse.json({ orderId, orderNumber: raced.orderNumber, uploads });
    }
    if (refusal) return refusal;

    if (abandoned) {
      // Its phone gets duplicate_order if it ever tries again; a photo it sent stays in storage.
      console.warn(
        "[orders] taken over",
        JSON.stringify({
          orderId: abandoned.id,
          replacedBy: orderId,
          brandId,
          idleMinutes: Math.round((now.getTime() - abandoned.updatedAt.getTime()) / 60_000),
        })
      );
    }
    return NextResponse.json({ orderId, orderNumber: input.orderNumber, uploads });
  } catch (err) {
    console.error(`${LOG} Error:`, queryCause(err));
    return orderError("server_error", "Internal Server Error");
  }
}
