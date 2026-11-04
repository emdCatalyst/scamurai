import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadOrder } from './presignedUpload';
import type { PendingOrder } from './staff/orderStore';

const order = {
  id: '6f1c2a9e-4b7d-4e2a-9c3b-1d2e3f4a5b6c',
  userId: 'user_a',
  orderNumber: 'A-1',
  deliveryAppId: 'app',
  subtotal: '10.00',
  currency: 'SAR',
  sealedBlob: new Blob(['s']),
  openedBlob: new Blob(['o']),
  createdAt: 1_790_000_000_000,
  attempts: 2,
} as PendingOrder;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const target = (name: string) => ({ url: `https://storage.example/${name}`, method: 'PUT' as const, headers: {} });
const urls = (uploads: object = { sealed: target('sealed'), opened: target('opened') }) =>
  json(200, { orderId: order.id, orderNumber: 'A-1', uploads });
const ok = () => new Response(null, { status: 200 });

type Answer = Response | Error | ((init: RequestInit) => Promise<Response>);

/** Answers fetch calls in order. */
function respond(...answers: Answer[]) {
  const fetch = vi.fn();
  for (const answer of answers) {
    fetch.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      if (answer instanceof Error) throw answer;
      return typeof answer === 'function' ? answer(init) : answer;
    });
  }
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

/** A request that never answers, until it is aborted (as fetch does). */
const hang = (init: RequestInit) =>
  new Promise<Response>((_, reject) =>
    init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  );

/** Headers arrive, then the body stalls until the request is aborted. */
const stallAfterHeaders = async (init: RequestInit) =>
  new Response(
    new ReadableStream({
      start(controller) {
        init.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
      },
    }),
    { status: 200 }
  );

describe('uploadOrder', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends the phone’s order id and account, then each photo in turn, then confirms', async () => {
    const fetch = respond(urls(), ok(), ok(), json(200, {}));
    expect(await uploadOrder(order)).toEqual({ status: 'sent' });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      clientOrderId: order.id,
      orderNumber: 'A-1',
      subtotal: '10.00',
      savedByUserId: 'user_a',
      savedAt: order.createdAt,
    });
    expect(fetch.mock.calls.slice(1, 3).map((call) => call[0])).toEqual([
      'https://storage.example/sealed',
      'https://storage.example/opened',
    ]);
    expect(fetch.mock.calls[3][0]).toBe(`/api/orders/${order.id}/confirm`);
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ savedAt: order.createdAt, attempts: order.attempts });
  });

  it('uploads only the photos storage does not have yet', async () => {
    const fetch = respond(urls({ opened: target('opened') }), ok(), json(200, {}));
    expect(await uploadOrder(order)).toEqual({ status: 'sent' });
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      '/api/orders/upload-urls',
      'https://storage.example/opened',
      `/api/orders/${order.id}/confirm`,
    ]);
  });

  it('treats an order the server already confirmed as delivered', async () => {
    const fetch = respond(json(200, { orderId: order.id, alreadyConfirmed: true }));
    expect(await uploadOrder(order)).toEqual({ status: 'sent' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('tries again later after network trouble, server errors, failed photos and missing photos', async () => {
    respond(new TypeError('Failed to fetch'));
    expect(await uploadOrder(order)).toMatchObject({ status: 'retry', error: 'Network error' });
    respond(json(503, {}));
    expect(await uploadOrder(order)).toMatchObject({ status: 'retry', code: 'server_error' });
    respond(urls(), ok(), new Response(null, { status: 403 }));
    expect(await uploadOrder(order)).toMatchObject({ status: 'retry', error: 'photo opened: 403' });
    respond(urls(), ok(), ok(), json(422, { error: 'Photos missing', code: 'photos_missing' }));
    expect(await uploadOrder(order)).toMatchObject({ status: 'retry', code: 'photos_missing' });
    // E.g. a Wi-Fi sign-in page answering instead of the server.
    respond(new Response('<html></html>', { status: 200 }));
    expect(await uploadOrder(order)).toMatchObject({ status: 'retry', error: 'upload-urls: unexpected answer' });
  });

  it('does not count a try while the phone is offline, or before the session is renewed', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    respond(new TypeError('Failed to fetch'));
    expect(await uploadOrder(order)).toEqual({ status: 'paused', error: 'Offline' });
    vi.stubGlobal('navigator', { onLine: true });
    respond(json(401, { error: 'Unauthorized', code: 'unauthenticated' }));
    expect(await uploadOrder(order)).toEqual({ status: 'paused', error: 'upload-urls: Unauthorized' });
  });

  it('leaves an order saved under another account for its owner', async () => {
    respond(json(409, { error: 'Saved by another account', code: 'other_account' }));
    expect(await uploadOrder(order)).toEqual({ status: 'otherAccount', error: 'upload-urls: Saved by another account' });
  });

  it('stops on answers that will not change, with the server’s code, field and reason', async () => {
    respond(json(409, { error: 'Order number already submitted', code: 'duplicate_order' }));
    expect(await uploadOrder(order)).toEqual({
      status: 'rejected',
      error: 'upload-urls: Order number already submitted',
      code: 'duplicate_order',
    });
    respond(json(400, { error: 'Invalid amount', code: 'invalid_input', field: 'subtotal' }));
    expect(await uploadOrder(order)).toMatchObject({ status: 'rejected', code: 'invalid_input', field: 'subtotal' });
    // An older server, without codes.
    respond(json(400, { error: 'Order number already exists for this branch' }));
    expect(await uploadOrder(order)).toMatchObject({ status: 'rejected', code: 'invalid_input' });
  });

  it('gives each photo time in proportion to its size, and at least a minute', async () => {
    vi.useFakeTimers();
    respond(urls(), hang);
    let small: unknown;
    void uploadOrder(order).then((outcome) => (small = outcome));
    await vi.advanceTimersByTimeAsync(59_000);
    expect(small).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1_001);
    expect(small).toEqual({ status: 'retry', error: 'Timed out' });

    // 400 KB: 20 s plus 100 s.
    respond(urls(), hang);
    let large: unknown;
    void uploadOrder({ ...order, sealedBlob: new Blob([new Uint8Array(400_000)]) }).then((outcome) => (large = outcome));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(large).toBeUndefined();
    await vi.advanceTimersByTimeAsync(60_001);
    expect(large).toEqual({ status: 'retry', error: 'Timed out' });
  });

  it('gives up on an answer that stalls after its headers', async () => {
    vi.useFakeTimers();
    respond(stallAfterHeaders);
    let outcome: unknown;
    void uploadOrder(order).then((result) => (outcome = result));
    await vi.advanceTimersByTimeAsync(20_001);
    expect(outcome).toEqual({ status: 'retry', error: 'Timed out' });
  });

  it('stops when the outbox gives up on it', async () => {
    const fetch = respond(urls(), hang);
    const watchdog = new AbortController();
    const outcome = uploadOrder(order, watchdog.signal);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    watchdog.abort();
    expect(await outcome).toEqual({ status: 'retry', error: 'Timed out' });
  });
});
