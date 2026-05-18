import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users, brandDeliveryApps } from "@/lib/db/schema";
import { getSupabase } from "@/lib/supabase";
import { eq, and, isNull } from "drizzle-orm";

const BUCKET = "order-images";
const LOG = "[POST /api/orders/upload-urls]";

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

    // 3. Duplicate order number check — unique per (branch + delivery app).
    //    The same order number can be reused across different delivery apps
    //    on the same branch (e.g. order "4" on Jahez and "4" on HungerStation),
    //    but not twice within the same branch+app.
    const existing = await db.query.orders.findFirst({
      where: and(
        eq(orders.brandId, brandId),
        eq(orders.branchId, user.branchId),
        eq(orders.deliveryAppId, deliveryAppId),
        eq(orders.orderNumber, orderNumber),
        isNull(orders.deletedAt)
      ),
    });
    if (existing) {
      return NextResponse.json(
        {
          error: "Order number already exists for this branch on this delivery app",
          code: "duplicate_order_number",
        },
        { status: 400 }
      );
    }

    // 4. Sign upload URLs FIRST — if the bucket is missing or signing fails,
    //    we surface the real error without leaving an orphan order behind.
    const supabase = getSupabase();
    const newOrderId = crypto.randomUUID();

    const signUpload = async (type: "sealed" | "opened") => {
      const path = `order-images/${brandId}/${newOrderId}/${type}.jpg`;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);
      if (error) {
        console.error(
          `${LOG} createSignedUploadUrl(${type}) failed for path=${path}:`,
          error
        );
        const hint =
          /not found|does not exist/i.test(error.message || "")
            ? ` (check that the "${BUCKET}" bucket exists in Supabase Storage)`
            : "";
        throw new Error(`Storage signing failed${hint}: ${error.message}`);
      }
      return data.signedUrl;
    };

    const [sealedUploadUrl, openedUploadUrl] = await Promise.all([
      signUpload("sealed"),
      signUpload("opened"),
    ]);

    // 5. Insert the order row only after signing succeeded.
    let inserted;
    try {
      [inserted] = await db
        .insert(orders)
        .values({
          id: newOrderId,
          brandId,
          orderNumber,
          branchId: user.branchId,
          deliveryAppId,
          submittedBy: user.id,
          subtotal: subtotal != null ? subtotal.toString() : null,
          currency: currency || "SAR",
          notes,
          status: "needs_review",
        })
        .returning();
    } catch (dbErr) {
      console.error(`${LOG} order insert failed:`, dbErr);
      return NextResponse.json(
        { error: dbErr instanceof Error ? dbErr.message : "Failed to create order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: inserted.id,
      orderNumber: inserted.orderNumber,
      sealedUploadUrl,
      openedUploadUrl,
    });
  } catch (err) {
    console.error(`${LOG} Error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
