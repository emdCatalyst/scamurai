import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderImages, users } from "@/lib/db/schema";
import { getSupabase } from "@/lib/supabase";
import { eq, and, isNull } from "drizzle-orm";

const BUCKET = "order-images";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const LOG = `[POST /api/orders/${orderId}/confirm]`;

  try {
    const { userId: clerkUserId, brandId } = await requireAuth(["staff"]);
    if (!brandId) {
      return NextResponse.json({ error: "User has no brand" }, { status: 403 });
    }

    const body = await req.json();
    const { sealedStoragePath, openedStoragePath } = body as {
      sealedStoragePath?: string;
      openedStoragePath?: string;
    };

    if (!sealedStoragePath || !openedStoragePath) {
      return NextResponse.json(
        { error: "sealedStoragePath and openedStoragePath are required" },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
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
    });
    if (!order) {
      console.error(`${LOG} order not found or unauthorized for user=${user.id} brand=${brandId}`);
      return NextResponse.json(
        { error: "Order not found or unauthorized" },
        { status: 404 }
      );
    }

    // Idempotency: if images already inserted (e.g. confirm was retried), succeed.
    const existing = await db.query.orderImages.findMany({
      where: eq(orderImages.orderId, orderId),
      columns: { id: true },
    });
    if (existing.length >= 2) {
      console.log(`${LOG} already confirmed (${existing.length} images present), no-op`);
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    // Verify both files actually exist in storage before writing DB rows.
    // This prevents a phantom-image row when the PUT silently failed.
    const supabase = getSupabase();
    const verifyExists = async (path: string) => {
      // list() with limit=1 + exact filename gives a cheap existence check.
      const lastSlash = path.lastIndexOf("/");
      const dir = lastSlash >= 0 ? path.slice(0, lastSlash) : "";
      const name = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(dir, { limit: 1, search: name });
      if (error) throw new Error(`storage list failed for ${path}: ${error.message}`);
      return !!data && data.some((f) => f.name === name);
    };

    const [sealedOk, openedOk] = await Promise.all([
      verifyExists(sealedStoragePath),
      verifyExists(openedStoragePath),
    ]);

    if (!sealedOk || !openedOk) {
      const missing = [
        !sealedOk ? sealedStoragePath : null,
        !openedOk ? openedStoragePath : null,
      ].filter(Boolean);
      console.error(`${LOG} missing in storage:`, missing);
      return NextResponse.json(
        { error: `Uploaded files not found in storage: ${missing.join(", ")}` },
        { status: 422 }
      );
    }

    // Bucket is private — images are served via signed URLs at read time.
    // We persist only the storagePath; storageUrl is kept as an empty string
    // because the column is NOT NULL but the URL is generated on demand.
    try {
      await db.insert(orderImages).values([
        {
          brandId,
          orderId,
          type: "sealed",
          storagePath: sealedStoragePath,
          storageUrl: "",
        },
        {
          brandId,
          orderId,
          type: "opened",
          storagePath: openedStoragePath,
          storageUrl: "",
        },
      ]);
    } catch (dbErr) {
      console.error(`${LOG} order_images insert failed:`, dbErr);
      return NextResponse.json(
        { error: "Failed to record uploaded images" },
        { status: 500 }
      );
    }

    await db
      .update(orders)
      .set({ submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    console.log(`${LOG} success`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`${LOG} Error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
