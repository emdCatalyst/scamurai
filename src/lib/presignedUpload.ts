import { orderErrorCode, RETRYABLE_ORDER_ERRORS, type OrderErrorBody } from "./orders/errors";
import type { UploadOutcome } from "./outbox";
import type { PendingOrder } from "./staff/orderStore";
import { ORDER_IMAGE_TYPES, type OrderImageType } from "./storage/keys";
import type { UploadTarget } from "./storage/types";

/** A hung request would hold up the whole outbox, so every step gives up in time. */
const API_TIMEOUT_MS = 20_000;
/**
 * 20 s plus 1 s per 4 KB, so a typical 300 KB photo (about 97 s) still
 * arrives at 32 kbit/s; at least a minute, and at most 10, well within the
 * signed URL's 15.
 */
const photoTimeoutMs = (bytes: number) => Math.min(Math.max(60_000, 20_000 + bytes / 4), 10 * 60_000);

type Outcome = UploadOutcome<PendingOrder>;
type Failure = Exclude<Outcome, { status: "sent" }>;

class StepError extends Error {
  constructor(readonly outcome: Failure) {
    super(outcome.error);
  }
}

interface Answer {
  ok: boolean;
  status: number;
  body: unknown;
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** One request, answer included, within `timeoutMs`; `signal` (the outbox's watchdog) cancels it too. */
async function send(url: string, init: RequestInit, timeoutMs: number, signal: AbortSignal): Promise<Answer> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  if (signal.aborted) abort();
  signal.addEventListener("abort", abort);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    // Read within the time limit as well: an answer can stall after its headers.
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: parseJson(text) };
  } catch {
    if (controller.signal.aborted) throw new StepError({ status: "retry", error: "Timed out" });
    // The phone knows it has no connection: that isn't an attempt.
    if (navigator.onLine === false) throw new StepError({ status: "paused", error: "Offline" });
    throw new StepError({ status: "retry", error: "Network error" });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

/** What an order API refusal means for the outbox (see src/lib/orders/errors.ts). */
function refusal(step: string, answer: Answer): StepError {
  const body = (answer.body ?? {}) as Partial<OrderErrorBody>;
  const code = orderErrorCode(answer.status, answer.body);
  const error = `${step}: ${typeof body.error === "string" ? body.error : answer.status}`;
  if (code === "other_account") return new StepError({ status: "otherAccount", error });
  // The session needs renewing (the outbox does that before its next round): trying again now would fail the same way.
  if (code === "unauthenticated") return new StepError({ status: "paused", error });
  if (RETRYABLE_ORDER_ERRORS.has(code)) return new StepError({ status: "retry", error, code });
  return new StepError({ status: "rejected", error, code, ...(typeof body.field === "string" && { field: body.field }) });
}

const photoOf = (order: PendingOrder, type: OrderImageType) => (type === "sealed" ? order.sealedBlob : order.openedBlob);

/**
 * Uploads one saved order. Every step is safe to repeat, so the outbox can
 * retry after any failure:
 * 1. ask for signed upload URLs; this creates the order under the phone's own
 *    id, or resumes it and lists only the photos storage doesn't have yet,
 * 2. upload those photos straight to storage, one at a time,
 * 3. confirm; the API checks that both photos arrived.
 */
export async function uploadOrder(order: PendingOrder, signal: AbortSignal = new AbortController().signal): Promise<Outcome> {
  try {
    const urls = await send(
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
          // Branch phones are shared: the server refuses an order saved under another account than the signed-in one.
          savedByUserId: order.userId,
          savedAt: order.createdAt,
        }),
      },
      API_TIMEOUT_MS,
      signal
    );
    if (!urls.ok) throw refusal("upload-urls", urls);

    const data = urls.body as {
      orderId?: unknown;
      alreadyConfirmed?: boolean;
      uploads?: Partial<Record<OrderImageType, UploadTarget>>;
    } | null;
    // E.g. a Wi-Fi sign-in page answering instead of the server.
    if (typeof data?.orderId !== "string") throw new StepError({ status: "retry", error: "upload-urls: unexpected answer" });
    // An earlier attempt finished but its answer never reached the phone.
    if (data.alreadyConfirmed) return { status: "sent" };

    // One at a time, so each photo has the whole connection.
    for (const type of ORDER_IMAGE_TYPES) {
      const target = data.uploads?.[type];
      if (!target) continue;
      const photo = photoOf(order, type);
      const put = await send(target.url, { method: target.method, body: photo, headers: target.headers }, photoTimeoutMs(photo.size), signal);
      // The next attempt gets fresh signed URLs.
      if (!put.ok) throw new StepError({ status: "retry", error: `photo ${type}: ${put.status}` });
    }

    const confirm = await send(
      `/api/orders/${data.orderId}/confirm`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // For the server's logs: how long the order waited on the phone.
        body: JSON.stringify({ savedAt: order.createdAt, attempts: order.attempts }),
      },
      API_TIMEOUT_MS,
      signal
    );
    // photos_missing (422): a photo didn't arrive, and the next attempt uploads it again.
    if (!confirm.ok) throw refusal("confirm", confirm);
    return { status: "sent" };
  } catch (err) {
    const outcome: Failure =
      err instanceof StepError ? err.outcome : { status: "retry", error: err instanceof Error ? err.message : "Upload failed" };
    console.warn("[uploadOrder]", order.orderNumber, outcome.error);
    return outcome;
  }
}
