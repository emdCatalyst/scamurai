import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users, brandDeliveryApps } from "@/lib/db/schema";
import { getStorage, ORDER_IMAGE_MAX_BYTES, ORDER_IMAGE_UPLOAD_TTL_SECONDS } from "@/lib/storage";
import { ORDER_IMAGE_TYPES, orderImageKey } from "@/lib/storage/keys";
import { eq, and, isNull } from "drizzle-orm";

const LOG = "[POST /api/orders/upload-urls]";

/**
 * Step 1 of a staff order submission: creates the order and returns one
 * signed upload URL per photo (sealed, opened). The browser uploads directly
 * to storage, then calls /api/orders/[orderId]/confirm.
 */
export async function POST(req: Request) {
  try {
    const { userId: clerkUserId, brandId } = await requireAuth(["staff"]);

    if (!brandId) {
      return NextResponse.json({ error: "User has no brand" }, { status: 403 });
    }

    const body = await req.json();
    const { deliveryAppId, subtotal, currency, notes, orderNumber } = body;

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 });
    }
    if (!deliveryAppId) {
      return NextResponse.json({ error: "Delivery app is required" }, { status: 400 });
    }

    // 1. Resolve staff user → branch
    const user = await db.query.users.findFirst({
      where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
    });
    if (!user || !user.branchId) {
      return NextResponse.json(
        { error: "Staff user not assigned to a branch" },
        { status: 400 }
      );
    }

    // 2. Verify the delivery app actually belongs to this brand
    //    (prevents FK insert error with an opaque message later).
    const app = await db.query.brandDeliveryApps.findFirst({
      where: and(
        eq(brandDeliveryApps.id, deliveryAppId),
        eq(brandDeliveryApps.brandId, brandId)
      ),
      columns: { id: true },
    });
    if (!app) {
      return NextResponse.json(
        { error: "Selected delivery app is not available for this brand" },
        { status: 400 }
      );
    }

    // 3. Duplicate order number check (per branch). The same staff member
    //    retrying an order whose photos never arrived (offline queue, dropped
    //    connection) resumes it with fresh upload URLs instead of being
    //    blocked by their own earlier attempt.
    const existing = await db.query.orders.findFirst({
      where: and(
        eq(orders.brandId, brandId),
        eq(orders.branchId, user.branchId),
        eq(orders.orderNumber, orderNumber),
        isNull(orders.deletedAt)
      ),
      columns: { id: true, submittedBy: true },
      with: { images: { columns: { id: true } } },
    });
    const resuming = existing !== undefined && existing.submittedBy === user.id && existing.images.length === 0;
    if (existing && !resuming) {
      return NextResponse.json(
        { error: "Order number already exists for this branch" },
        { status: 400 }
      );
    }

    // 4. Sign the upload URLs FIRST: if storage is misconfigured we surface
    //    the real error without leaving an orphan order behind.
    const storage = getStorage();
    const orderId = existing?.id ?? crypto.randomUUID();
    const [sealed, opened] = await Promise.all(
      ORDER_IMAGE_TYPES.map((type) =>
        storage.createUploadUrl("orderImages", orderImageKey(brandId, orderId, type), {
          contentType: "image/jpeg",
          maxBytes: ORDER_IMAGE_MAX_BYTES,
          expiresInSeconds: ORDER_IMAGE_UPLOAD_TTL_SECONDS,
        })
      )
    );

    // 5. Insert the order row only after signing succeeded.
    if (!resuming) {
      try {
        await db.insert(orders).values({
          id: orderId,
          brandId,
          orderNumber,
          branchId: user.branchId,
          deliveryAppId,
          submittedBy: user.id,
          subtotal: subtotal != null ? subtotal.toString() : null,
          currency: currency || "SAR",
          notes,
          status: "needs_review",
        });
      } catch (dbErr) {
        console.error(`${LOG} order insert failed:`, dbErr);
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
      }
    }

    return NextResponse.json({ orderId, orderNumber, uploads: { sealed, opened } });
  } catch (err) {
    console.error(`${LOG} Error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
