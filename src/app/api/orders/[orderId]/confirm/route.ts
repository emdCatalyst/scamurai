import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderImages, users } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { ORDER_IMAGE_TYPES, orderImageKey } from "@/lib/storage/keys";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Step 2 of a staff order submission, after both photos were uploaded to the
 * signed URLs. The object keys are derived here from the order itself; any
 * paths in the request body are ignored, so a client can never attach
 * another order's (or another brand's) photos.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const LOG = `[PATCH /api/orders/${orderId}/confirm]`;

  try {
    const { userId: clerkUserId, brandId } = await requireAuth(["staff"]);
    if (!brandId) {
      return NextResponse.json({ error: "User has no brand" }, { status: 403 });
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
      columns: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.brandId, brandId),
        eq(orders.submittedBy, user.id)
      ),
      columns: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
    }

    // Idempotency: a retried confirm succeeds without duplicating rows.
    const existing = await db.query.orderImages.findMany({
      where: eq(orderImages.orderId, orderId),
      columns: { id: true },
    });
    if (existing.length >= ORDER_IMAGE_TYPES.length) {
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    // Both photos must actually be in storage before the order counts as submitted.
    const storage = getStorage();
    const keys = ORDER_IMAGE_TYPES.map((type) => ({ type, key: orderImageKey(brandId, orderId, type) }));
    const present = await Promise.all(keys.map(({ key }) => storage.exists("orderImages", key)));
    const missing = keys.filter((_, i) => !present[i]).map(({ type }) => type);
    if (missing.length > 0) {
      console.error(`${LOG} photos missing in storage:`, missing);
      return NextResponse.json({ error: `Photos not uploaded: ${missing.join(", ")}` }, { status: 422 });
    }

    // Images are private; read URLs are signed on demand, so only the key is stored.
    await db.transaction(async (tx) => {
      await tx
        .insert(orderImages)
        .values(keys.map(({ type, key }) => ({ brandId, orderId, type, storagePath: key, storageUrl: "" })))
        .onConflictDoNothing();
      await tx
        .update(orders)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`${LOG} Error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
