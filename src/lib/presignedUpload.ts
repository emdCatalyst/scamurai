import type { UploadTarget } from "./storage/types";
import { PendingOrder } from "./imageQueue";

export interface UploadResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

const LOG = "[uploadOrder]";

/**
 * Handles the full background upload flow for an order.
 * 1. Request signed upload URLs from the API (it also creates the order)
 * 2. Upload both photos in parallel, directly to storage
 * 3. Confirm with the API (it derives the photo paths itself)
 */
export async function uploadOrder(order: PendingOrder): Promise<UploadResponse> {
  try {
    // 1. Get presigned URLs
    console.log(`${LOG} step 1: requesting upload URLs for orderNumber=${order.orderNumber}`);
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
      const errorData = await urlResponse.json().catch(() => ({}));
      const msg = errorData.error || `upload-urls returned ${urlResponse.status}`;
      console.error(`${LOG} step 1 failed:`, msg, errorData);
      throw new Error(msg);
    }

    const { orderId, orderNumber, uploads } = (await urlResponse.json()) as {
      orderId: string;
      orderNumber: string;
      uploads: Record<'sealed' | 'opened', UploadTarget>;
    };
    console.log(`${LOG} step 1 ok: orderId=${orderId}`);

    // 2. Parallel upload directly to storage, with exactly the signed headers
    const uploadFile = async (label: string, target: UploadTarget, blob: Blob) => {
      console.log(`${LOG} step 2 (${label}): PUT to storage, size=${blob.size}`);
      const res = await fetch(target.url, { method: target.method, body: blob, headers: target.headers });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const msg = `Storage PUT (${label}) failed: ${res.status} ${res.statusText} ${text}`.trim();
        console.error(`${LOG} step 2 (${label}) failed:`, msg);
        throw new Error(msg);
      }
      console.log(`${LOG} step 2 (${label}) ok`);
    };

    await Promise.all([
      uploadFile('sealed', uploads.sealed, order.sealedBlob),
      uploadFile('opened', uploads.opened, order.openedBlob),
    ]);

    // 3. Confirm submission
    console.log(`${LOG} step 3: confirming order ${orderId}`);
    const confirmResponse = await fetch(`/api/orders/${orderId}/confirm`, {
      method: 'PATCH',
    });

    if (!confirmResponse.ok) {
      const errorData = await confirmResponse.json().catch(() => ({}));
      const msg = errorData.error || `confirm returned ${confirmResponse.status}`;
      console.error(`${LOG} step 3 failed:`, msg, errorData);
      throw new Error(msg);
    }
    console.log(`${LOG} step 3 ok: order ${orderId} confirmed`);

    return { success: true, orderId, orderNumber };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown upload error';
    console.error(`${LOG} aborted:`, message);
    return { success: false, error: message };
  }
}
