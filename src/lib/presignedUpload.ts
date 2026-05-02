import { PendingOrder } from "./imageQueue";

export interface UploadResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

/**
 * Handles the full background upload flow for an order.
 * 1. Request presigned URLs from API
 * 2. Parallel upload to Supabase Storage
 * 3. Confirm with API
 */
export async function uploadOrder(order: PendingOrder): Promise<UploadResponse> {
  try {
    // 1. Get presigned URLs
    const urlResponse = await fetch('/api/orders/upload-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandSlug: order.brandSlug,
        orderNumber: order.orderNumber,
        deliveryAppId: order.deliveryAppId,
        subtotal: order.subtotal,
        currency: order.currency,
        notes: order.notes,
      }),
    });

    if (!urlResponse.ok) {
      const errorData = await urlResponse.json();
      throw new Error(errorData.error || 'Failed to get upload URLs');
    }

    const { orderId, orderNumber, sealedUploadUrl, openedUploadUrl } = await urlResponse.json();

    // 2. Parallel upload directly to Supabase Storage
    const uploadFile = async (url: string, blob: Blob) => {
      const res = await fetch(url, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'image/jpeg',
          'cache-control': '3600',
        },
      });
      if (!res.ok) throw new Error('Storage upload failed');
    };

    await Promise.all([
      uploadFile(sealedUploadUrl, order.sealedBlob),
      uploadFile(openedUploadUrl, order.openedBlob),
    ]);

    // 3. Confirm submission
    const confirmResponse = await fetch(`/api/orders/${orderId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sealedStoragePath: `order-images/${order.brandId}/${orderId}/sealed.jpg`,
        openedStoragePath: `order-images/${order.brandId}/${orderId}/opened.jpg`,
      }),
    });

    if (!confirmResponse.ok) {
      const errorData = await confirmResponse.json();
      throw new Error(errorData.error || 'Failed to confirm order');
    }

    return { success: true, orderId, orderNumber };
  } catch (err) {
    console.error('[uploadOrder] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown upload error' };
  }
}
