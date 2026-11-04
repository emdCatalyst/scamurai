import { NextResponse } from "next/server";
import { ORDER_SUBMITTER_ROLES, requireApiAuth } from "@/lib/auth";
import { staffDb } from "@/lib/db";
import { orders, orderImages, users } from "@/lib/db/schema";
import { staffRateLimits } from "@/lib/ratelimit";
import { getStorage } from "@/lib/storage";
import { ORDER_IMAGE_TYPES, orderImageKey } from "@/lib/storage/keys";
import { CONFIRM_REQUEST_MAX_BYTES, confirmRequestSchema, isOrderId, waitedSeconds } from "@/lib/validations/orders";
import { eq, and, isNull } from "drizzle-orm";
import { orderError, queryCause, readJson } from "../../respond";

/**
 * Step 2 of a staff order submission, after both photos were uploaded to the
 * signed URLs. The object keys are derived here from the order itself; any
 * paths in the request body are ignored, so a client can never attach
 * another order's (or another brand's) photos.
 */

const LOG = "[PATCH /api/orders/[orderId]/confirm]";

/**
 * What the phone says about the upload: when the worker saved the order and
 * how many attempts it took. Logged only, never stored and never a reason to
 * refuse: phone clocks can be wrong. The `[orders] confirmed` line shows how
 * long orders wait on phones.
 */
async function uploadReport(req: Request) {
  const report = confirmRequestSchema.safeParse(await readJson(req, CONFIRM_REQUEST_MAX_BYTES));
  if (!report.success) return {};
  return { waitedSec: waitedSeconds(report.data.savedAt), attempts: report.data.attempts ?? undefined };
}

const replaced = () => orderError("duplicate_order", "Another submission of this order number replaced this one");

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const report = await uploadReport(req);

  try {
    const session = await requireApiAuth(ORDER_SUBMITTER_ROLES);
    if (session instanceof Response) return session;
    const { userId: clerkUserId, brandId } = session;
    if (staffRateLimits.confirm(clerkUserId)) {
      return orderError("rate_limited", "Too many requests; try again later");
    }
    if (!brandId) {
      return orderError("forbidden", "User has no brand");
    }
    // Anything but a UUID names no order, and must not reach a query or a log line.
    if (!isOrderId(orderId)) {
      return orderError("not_found", "Order not found");
    }

    const user = await staffDb.query.users.findFirst({
      where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
      columns: { id: true },
    });
    if (!user) {
      return orderError("forbidden", "Not a staff member of this brand");
    }

    const order = await staffDb.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.brandId, brandId),
        eq(orders.submittedBy, user.id)
      ),
      columns: { id: true, confirmedAt: true, deletedAt: true },
    });
    if (!order) {
      return orderError("not_found", "Order not found or unauthorized");
    }

    // Idempotency: a retried confirm succeeds without duplicating rows.
    if (order.confirmedAt) {
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }
    if (order.deletedAt) return replaced();

    // Both photos must actually be in storage before the order counts as submitted.
    const storage = getStorage();
    const keys = ORDER_IMAGE_TYPES.map((type) => ({ type, key: orderImageKey(brandId, orderId, type) }));
    const present = await Promise.all(keys.map(({ key }) => storage.exists("orderImages", key)));
    const missing = keys.filter((_, i) => !present[i]).map(({ type }) => type);
    if (missing.length > 0) {
      // Expected on weak connections: the phone's next attempt uploads them again.
      console.warn(LOG, "photos missing in storage", JSON.stringify({ orderId, missing }));
      return orderError("photos_missing", `Photos not uploaded: ${missing.join(", ")}`);
    }

    // Images are private; read URLs are signed on demand, so only the key is stored.
    const confirmed = await staffDb.transaction(async (tx) => {
      const now = new Date();
      // Unless a colleague took the number over while the photos were on their way (upload-urls).
      const open = await tx
        .update(orders)
        .set({ confirmedAt: now, submittedAt: now, updatedAt: now })
        .where(and(eq(orders.id, orderId), isNull(orders.deletedAt)))
        .returning({ id: orders.id });
      if (open.length === 0) return false;
      await tx
        .insert(orderImages)
        .values(keys.map(({ type, key }) => ({ brandId, orderId, type, storagePath: key, storageUrl: "" })))
        .onConflictDoNothing();
      return true;
    });
    if (!confirmed) return replaced();

    console.info("[orders] confirmed", JSON.stringify({ orderId, brandId, ...report }));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`${LOG} Error:`, JSON.stringify({ orderId }), queryCause(err));
    return orderError("server_error", "Internal Server Error");
  }
}
