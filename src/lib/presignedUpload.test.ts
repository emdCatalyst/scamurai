import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PendingOrder } from './imageQueue';
import { uploadOrder } from './presignedUpload';

const order = {
  id: '6f1c2a9e-4b7d-4e2a-9c3b-1d2e3f4a5b6c',
  userId: 'user_a',
  orderNumber: 'A-1',
  deliveryAppId: 'app',
  subtotal: '10',
  currency: 'SAR',
  sealedBlob: new Blob(['s']),
  openedBlob: new Blob(['o']),
  createdAt: 1_790_000_000_000,
  attempts: 2,
} as PendingOrder;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const target = { url: 'https://storage.example/x', method: 'PUT', headers: {} };
const urls = json(200, { orderId: order.id, uploads: { sealed: target, opened: target } });

/** Answers fetch calls in order. */
function respond(...responses: Array<Response | Error>) {
  const fetch = vi.fn();
  for (const r of responses) fetch.mockImplementationOnce(async () => (r instanceof Error ? Promise.reject(r) : r));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('uploadOrder', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the phone’s order id and walks the three steps', async () => {
    const fetch = respond(urls, new Response(null, { status: 200 }), new Response(null, { status: 200 }), json(200, {}));
    expect(await uploadOrder(order)).toEqual({ ok: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ clientOrderId: order.id, orderNumber: 'A-1' });
    expect(fetch.mock.calls[3][0]).toBe(`/api/orders/${order.id}/confirm`);
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ savedAt: order.createdAt, attempts: order.attempts });
  });

  it('treats an order the server already confirmed as delivered', async () => {
    const fetch = respond(json(200, { orderId: order.id, alreadyConfirmed: true }));
    expect(await uploadOrder(order)).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries network trouble, server errors and missing photos', async () => {
    respond(new TypeError('Failed to fetch'));
    expect(await uploadOrder(order)).toMatchObject({ ok: false, retry: true });
    respond(json(503, {}));
    expect(await uploadOrder(order)).toMatchObject({ ok: false, retry: true });
    respond(urls, new Response(null, { status: 200 }), new Response(null, { status: 403 }));
    expect(await uploadOrder(order)).toMatchObject({ ok: false, retry: true });
    respond(json(200, { orderId: order.id, uploads: { sealed: target, opened: target } }), new Response(null, { status: 200 }), new Response(null, { status: 200 }), json(422, { error: 'Photos missing' }));
    expect(await uploadOrder(order)).toMatchObject({ ok: false, retry: true });
  });

  it('stops on answers that will not change, with the server’s reason', async () => {
    respond(json(400, { error: 'Order number already exists for this branch' }));
    expect(await uploadOrder(order)).toEqual({
      ok: false,
      retry: false,
      error: 'upload-urls: Order number already exists for this branch',
    });
  });
});
