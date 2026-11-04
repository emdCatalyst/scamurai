import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getOrderDetail } from "@/lib/queries/orders";
import { getStorage, ORDER_IMAGE_READ_TTL_SECONDS } from "@/lib/storage";
import { isOrderId } from "@/lib/validations/orders";
import { orderError, queryCause } from "../../respond";

/**
 * Order details plus short-lived read URLs for its two photos. Photos are
 * private; only finance and brand admins of the order's brand get URLs.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await requireApiAuth(["finance", "brand_admin"]);
    if (session instanceof Response) return session;
    const { brandId } = session;

    if (!brandId) {
      return orderError("forbidden", "User has no brand");
    }

    const { orderId } = await params;

    const order = isOrderId(orderId) ? await getOrderDetail(orderId, brandId) : null;
    if (!order) {
      return orderError("not_found", "Order not found");
    }

    const storage = getStorage();

    // The browser scales the (already compressed, ≤1920px) photo for thumbnails.
    const sign = async (path: string | undefined) => {
      if (!path) return null;
      const url = await storage.createReadUrl("orderImages", path, { expiresInSeconds: ORDER_IMAGE_READ_TTL_SECONDS });
      return { thumb: url, full: url };
    };

    const [sealed, opened] = await Promise.all([
      sign(order.images.find((image) => image.type === "sealed")?.storagePath),
      sign(order.images.find((image) => image.type === "opened")?.storagePath),
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
      images: { sealed, opened },
    });
  } catch (err) {
    console.error("[GET /api/orders/[orderId]/signed-urls] Error:", queryCause(err));
    return orderError("server_error", "Internal Server Error");
  }
}
