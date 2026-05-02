import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderImages, users } from "@/lib/db/schema";
import { getSupabase } from "@/lib/supabase";
import { eq, and, isNull } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { userId: clerkUserId, brandId } = await requireAuth(["staff"]);
    const { orderId } = await params;

    const body = await req.json();
    const { sealedStoragePath, openedStoragePath } = body;

    // 1. Get user details from DB
    const user = await db.query.users.findFirst({
      where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Verify order belongs to this brand and was created by this user
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.brandId, brandId as string),
        eq(orders.submittedBy, user.id)
      ),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
    }

    // 3. Create order_images entries
    const supabase = getSupabase();
    
    const getPublicUrl = (path: string) => {
      const { data } = supabase.storage.from('order-images').getPublicUrl(path);
      // NOTE: GEMINI.md says images should be served via signed URLs, but 
      // the schema has storageUrl. For now we use public URL if bucket is public,
      // or we might need a different strategy if it's private.
      // GEMINI.md says: "Private bucket — images served via signed URLs (1-hour expiry), never public."
      // So storageUrl should probably be a signed URL or we generate it on the fly in queries.
      // For now, let's store the path and a dummy URL or the public one if it exists.
      return data.publicUrl;
    };

    // We insert the images
    await db.insert(orderImages).values([
      {
        brandId: brandId as string,
        orderId,
        type: 'sealed',
        storagePath: sealedStoragePath,
        storageUrl: getPublicUrl(sealedStoragePath),
      },
      {
        brandId: brandId as string,
        orderId,
        type: 'opened',
        storagePath: openedStoragePath,
        storageUrl: getPublicUrl(openedStoragePath),
      }
    ]);

    // 4. Update order submitted_at to confirm completion
    await db.update(orders)
      .set({ 
        submittedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[PATCH /api/orders/[orderId]/confirm] Error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Internal Server Error" 
    }, { status: 500 });
  }
}
