import type { UploadTarget } from "./storage/types";
import type { PendingOrder } from "./imageQueue";
import type { UploadOutcome } from "./outbox";

/** A hung request would hold up the whole outbox, so every step gives up in time. */
const API_TIMEOUT_MS = 20_000;
const PHOTO_TIMEOUT_MS = 60_000;

class StepError extends Error {
  constructor(message: string, readonly retry: boolean) {
    super(message);
  }
}

/** Worth trying again later: expired session, rate limit, server trouble. */
const retryable = (status: number) => status === 401 || status === 408 || status === 429 || status >= 500;

async function send(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    throw new StepError(err instanceof Error && err.name === "AbortError" ? "Timed out" : "Network error", true);
  } finally {
    clearTimeout(timer);
  }
}

async function fail(step: string, res: Response, retry: boolean): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new StepError(`${step}: ${body.error ?? res.status}`, retry);
}

/**
 * Uploads one saved order. Every step is safe to repeat, so the outbox can
 * retry after any failure:
 * 1. ask for signed upload URLs; this creates the order under the phone's own id,
 * 2. upload both photos straight to storage,
 * 3. confirm; the API checks that both photos arrived.
 */
export async function uploadOrder(order: PendingOrder): Promise<UploadOutcome> {
  try {
    const res = await send(
      "/api/orders/upload-urls",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientOrderId: order.id,
          orderNumber: order.orderNumber,
          deliveryAppId: order.deliveryAppId,
          subtotal: order.subtotal,
          currency: order.currency,
          notes: order.notes,
        }),
      },
      API_TIMEOUT_MS
    );
    if (!res.ok) await fail("upload-urls", res, retryable(res.status));

    const data = (await res.json()) as {
      orderId: string;
      alreadyConfirmed?: boolean;
      uploads: Record<"sealed" | "opened", UploadTarget>;
    };
    // An earlier attempt finished but its answer never reached the phone.
    if (data.alreadyConfirmed) return { ok: true };

    await Promise.all(
      (["sealed", "opened"] as const).map(async (type) => {
        const target = data.uploads[type];
        const body = type === "sealed" ? order.sealedBlob : order.openedBlob;
        const put = await send(target.url, { method: target.method, body, headers: target.headers }, PHOTO_TIMEOUT_MS);
        // The next attempt gets fresh signed URLs.
        if (!put.ok) throw new StepError(`photo ${type}: ${put.status}`, true);
      })
    );

    const confirm = await send(`/api/orders/${data.orderId}/confirm`, { method: "PATCH" }, API_TIMEOUT_MS);
    // 422: a photo didn't arrive, and the next attempt uploads it again.
    if (!confirm.ok) await fail("confirm", confirm, retryable(confirm.status) || confirm.status === 422);
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Upload failed";
    console.warn("[uploadOrder]", order.orderNumber, error);
    return { ok: false, retry: err instanceof StepError ? err.retry : true, error };
  }
}
