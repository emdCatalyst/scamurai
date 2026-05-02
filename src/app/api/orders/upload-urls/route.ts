import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { getSupabase } from "@/lib/supabase";
import { eq, and, isNull } from "drizzle-orm";

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

    // 1. Get user details from DB to get internal ID and branchId
    const user = await db.query.users.findFirst({
      where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
    });

    if (!user || !user.branchId) {
      return NextResponse.json({ error: "Staff user not assigned to a branch" }, { status: 400 });
    }

    // 2. Check for duplicate order number in this branch
    const existing = await db.query.orders.findFirst({
      where: and(
        eq(orders.brandId, brandId),
        eq(orders.branchId, user.branchId),
        eq(orders.orderNumber, orderNumber),
        isNull(orders.deletedAt)
      ),
    });

    if (existing) {
      return NextResponse.json({ 
        error: "Order number already exists for this branch" 
      }, { status: 400 });
    }

    // 3. Create pending order row
    const [newOrder] = await db.insert(orders).values({
      brandId,
      orderNumber,
      branchId: user.branchId,
      deliveryAppId,
      submittedBy: user.id,
      subtotal: subtotal.toString(),
      currency: currency || "SAR",
      notes,
      status: "needs_review",
    }).returning();

    // 4. Generate presigned upload URLs
    const supabase = getSupabase();
    
    const getUploadUrl = async (type: string) => {
      const path = `order-images/${brandId}/${newOrder.id}/${type}.jpg`;
      const { data, error } = await supabase.storage
        .from('order-images')
        .createSignedUploadUrl(path);
      
      if (error) throw error;
      return data.signedUrl;
    };

    const [sealedUploadUrl, openedUploadUrl] = await Promise.all([
      getUploadUrl('sealed'),
      getUploadUrl('opened'),
    ]);

    return NextResponse.json({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      sealedUploadUrl,
      openedUploadUrl,
    });

  } catch (err) {
    console.error('[POST /api/orders/upload-urls] Error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Internal Server Error" 
    }, { status: 500 });
  }
}
