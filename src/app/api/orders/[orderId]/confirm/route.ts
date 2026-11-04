import { NextResponse } from "next/server";
import { ORDER_SUBMITTER_ROLES, requireApiAuth } from "@/lib/auth";
import { staffDb } from "@/lib/db";
import { orders, orderImages, users } from "@/lib/db/schema";
import { staffRateLimits } from "@/lib/ratelimit";
import { getStorage } from "@/lib/storage";
import { ORDER_IMAGE_TYPES, orderImageKey } from "@/lib/storage/keys";
import { eq, and, isNull } from "drizzle-orm";
import { orderError } from "../../respond";

/**
 * Step 2 of a staff order submission, after both photos were uploaded to the
 * signed URLs. The object keys are derived here from the order itself; any
 * paths in the request body are ignored, so a client can never attach
 * another order's (or another brand's) photos.
 */

/**
 * What the phone says about the upload: when the worker saved the order and
 * how many attempts it took. Logged only, never stored: phone clocks can be
 * wrong. The `[orders] confirmed` line shows how long orders wait on phones.
 */
async function uploadReport(req: Request) {
  const body = await req.json().catch(() => null);
  const savedAt = Number(body?.savedAt);
  const attempts = Number(body?.attempts);
  return {
    waitedSec: Number.isFinite(savedAt) && savedAt > 0 ? Math.max(0, Math.round((Date.now() - savedAt) / 1000)) : undefined,
    attempts: Number.isInteger(attempts) && attempts >= 0 ? Math.min(attempts, 10_000) : undefined,
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const LOG = `[PATCH /api/orders/${orderId}/confirm]`;
  const report = await uploadReport(req);

  try {
    const session = await requireApiAuth(ORDER_SUBMITTER_ROLES);
    if (session instanceof Response) return session;
    const { userId: clerkUserId, brandId } = session;
    if (staffRateLimits.confirm(clerkUserId)) {
      return orderError("rate_limited", "Too many requests; try again later");
    }
    if (!brandId) {
      return NextResponse.json({ error: "User has no brand" }, { status: 403 });
    }

    const user = await staffDb.query.users.findFirst({
      where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
      columns: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const order = await staffDb.query.orders.findFirst({
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
    const existing = await staffDb.query.orderImages.findMany({
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
    await staffDb.transaction(async (tx) => {
      await tx
        .insert(orderImages)
        .values(keys.map(({ type, key }) => ({ brandId, orderId, type, storagePath: key, storageUrl: "" })))
        .onConflictDoNothing();
      await tx
        .update(orders)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    });

    console.info("[orders] confirmed", JSON.stringify({ orderId, brandId, ...report }));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`${LOG} Error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
