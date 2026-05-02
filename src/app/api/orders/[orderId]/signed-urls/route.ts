import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOrderDetail } from "@/lib/queries/orders";
import { getSupabase } from "@/lib/supabase";

const SIGNED_URL_TTL_SECONDS = 600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { brandId } = await requireAuth(["finance", "brand_admin"]);

    if (!brandId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { orderId } = await params;

    const order = await getOrderDetail(orderId, brandId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const supabase = getSupabase();

    const sealed = order.images.find((i) => i.type === "sealed");
    const opened = order.images.find((i) => i.type === "opened");

    const signOne = async (path: string | undefined) => {
      if (!path) return null;

      // Full-res signed URL (used by lightbox).
      const { data: fullData, error: fullError } = await supabase.storage
        .from("order-images")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (fullError || !fullData) return null;

      // Thumbnail — try Supabase image transformation. Falls back to full-res
      // if the project doesn't have the Image Transformation feature enabled.
      let thumb = fullData.signedUrl;
      try {
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from("order-images")
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
            transform: { width: 800, quality: 70, resize: "cover" },
          });
        if (!thumbError && thumbData?.signedUrl) {
          thumb = thumbData.signedUrl;
        }
      } catch {
        // Transformations unavailable; thumb stays as the full-res URL.
      }

      return { thumb, full: fullData.signedUrl };
    };

    const [sealedSet, openedSet] = await Promise.all([
      signOne(sealed?.storagePath),
      signOne(opened?.storagePath),
    ]);

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        branchName: order.branchName,
        deliveryAppName: order.deliveryAppName,
        deliveryAppLogoUrl: order.deliveryAppLogoUrl,
        submittedByName: order.submittedByName,
        submittedByEmail: order.submittedByEmail,
        subtotal: order.subtotal,
        currency: order.currency,
        notes: order.notes,
        submittedAt: order.submittedAt,
      },
      images: {
        sealed: sealedSet,
        opened: openedSet,
      },
    });
  } catch (err) {
    console.error("[GET /api/orders/[orderId]/signed-urls] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
