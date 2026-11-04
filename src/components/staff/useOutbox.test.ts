// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadOutcome } from '@/lib/outbox';
import type { PendingOrder } from '@/lib/staff/orderStore';

const clerk = vi.hoisted(() => ({ userId: 'user_a' as string | null | undefined }));
const uploadOrder = vi.hoisted(() => vi.fn<(order: PendingOrder) => Promise<UploadOutcome<PendingOrder>>>());
const reloadFromServer = vi.hoisted(() => vi.fn(async () => {}));
const sendTelemetry = vi.hoisted(() => vi.fn());
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ userId: clerk.userId }) }));
vi.mock('@/lib/presignedUpload', () => ({ uploadOrder }));
vi.mock('@/lib/staff/pageCache', () => ({ reloadFromServer }));
vi.mock('@/lib/telemetry', () => ({ sendTelemetry }));

// Loaded afresh for each test: the outbox and its reports live at module level.
let React: typeof import('react');
let ReactDOM: typeof import('react-dom/client');
let hook: typeof import('./useOutbox');
let orderStore: typeof import('@/lib/staff/orderStore');
let localDb: typeof import('@/lib/staff/localDb');

let online = true;
let unmount: (() => void) | undefined;

beforeEach(async () => {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
  online = true;
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
  clerk.userId = 'user_a';
  uploadOrder.mockReset().mockResolvedValue({ status: 'sent' });
  reloadFromServer.mockClear();
  sendTelemetry.mockClear();
  React = await import('react');
  ReactDOM = await import('react-dom/client');
  hook = await import('./useOutbox');
  orderStore = await import('@/lib/staff/orderStore');
  localDb = await import('@/lib/staff/localDb');
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window as { Clerk?: unknown }).Clerk;
});

const order = (id: string, overrides: Partial<PendingOrder> = {}): PendingOrder => ({
  id,
  userId: 'user_a',
  brandId: 'b',
  brandSlug: 'demo',
  orderNumber: id,
  deliveryAppId: 'app',
  subtotal: '10.00',
  currency: 'SAR',
  sealedBlob: new Blob(['s']),
  openedBlob: new Blob(['o']),
  createdAt: Date.now(),
  attempts: 0,
  ...overrides,
});

type Outbox = ReturnType<typeof import('./useOutbox').useOutbox>;

/**
 * Renders the hook for the worker the page was made for. Without act():
 * React renders on its own scheduler while the test polls, the way the
 * phone's IndexedDB and timers drive it.
 */
async function render(userId = 'user_a') {
  const result = { current: undefined as unknown as Outbox };
  function Probe() {
    result.current = hook.useOutbox(userId);
    return null;
  }
  const root = ReactDOM.createRoot(document.createElement('div'));
  root.render(React.createElement(Probe));
  unmount = () => root.unmount();
  await until(() => expect(result.current).toBeDefined());
  return result;
}

/** Lets timers, IndexedDB and React settle until `check` passes. */
const until = (check: () => void) => vi.waitFor(check);

describe('useOutbox', () => {
  it('uploads the worker’s saved orders when the screen opens, renewing the session first', async () => {
    const getToken = vi.fn(async () => 'token');
    (window as { Clerk?: unknown }).Clerk = { session: { getToken } };
    await orderStore.pendingOrders.save(order('o1'));
    await orderStore.pendingOrders.save(order('o2', { userId: 'user_b' }));

    const outbox = await render();
    await until(() => expect(uploadOrder).toHaveBeenCalledTimes(1));
    expect(uploadOrder.mock.calls[0][0]).toMatchObject({ id: 'o1' });
    expect(getToken.mock.invocationCallOrder[0]).toBeLessThan(uploadOrder.mock.invocationCallOrder[0]);
    await until(() => expect(outbox.current).toMatchObject({ waiting: 0, otherAccounts: 1, wrongAccount: false }));
  });

  it('waits while the phone is offline, then uploads a few seconds after it is back', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    online = false;
    await orderStore.pendingOrders.save(order('o1'));
    const outbox = await render();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(uploadOrder).not.toHaveBeenCalled();
    await until(() => expect(outbox.current.waiting).toBe(1));

    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(1_900);
    expect(uploadOrder).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    await until(() => expect(uploadOrder).toHaveBeenCalledTimes(1));
  });

  it('on a screen made for another account, uploads nothing and keeps trying to reload from the server', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    clerk.userId = 'user_b';
    await orderStore.pendingOrders.save(order('o1'));
    const outbox = await render('user_a');
    expect(outbox.current.wrongAccount).toBe(true);
    await until(() => expect(reloadFromServer).toHaveBeenCalledTimes(1));

    // E.g. the first reload was skipped: it reloaded a moment ago, or a sign-out was under way.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reloadFromServer).toHaveBeenCalledTimes(2);
    online = false;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reloadFromServer).toHaveBeenCalledTimes(2);
    online = true;
    window.dispatchEvent(new Event('online'));
    expect(reloadFromServer).toHaveBeenCalledTimes(3);
    expect(uploadOrder).not.toHaveBeenCalled();
  });

  it('treats a screen nobody is signed in to as made for another account, but not one Clerk has not checked yet', async () => {
    clerk.userId = null;
    expect((await render()).current.wrongAccount).toBe(true);
    unmount!();

    clerk.userId = undefined;
    expect((await render()).current.wrongAccount).toBe(false);
  });

  it('stops and reloads once the server says the order belongs to another account', async () => {
    uploadOrder.mockResolvedValue({ status: 'otherAccount', error: 'Saved by another account' });
    await orderStore.pendingOrders.save(order('o1'));
    const outbox = await render();
    await until(() => expect(outbox.current.wrongAccount).toBe(true));
    expect(reloadFromServer).toHaveBeenCalled();
    expect(outbox.current.failed).toEqual([]);
  });

  it('keeps an order the phone could not save, says why, and still sends it while the page is open', async () => {
    let release!: () => void;
    uploadOrder.mockImplementation(() => new Promise((resolve) => (release = () => resolve({ status: 'sent' }))));
    vi.spyOn(orderStore.pendingOrders, 'save').mockRejectedValue(new localDb.LocalDbError('quota', 'QuotaExceededError'));
    const outbox = await render();

    const result = await outbox.current.submit(order('o1'));
    expect(result).toEqual({ onPhone: false, problem: 'quota' });
    await until(() => expect(uploadOrder).toHaveBeenCalledTimes(1));
    expect(outbox.current.unsaved).toBe(1);
    release();
    await until(() => expect(outbox.current).toMatchObject({ unsaved: 0, waiting: 0 }));
  });

  it('saves a submitted order on the phone before uploading it', async () => {
    const outbox = await render();
    const result = await outbox.current.submit(order('o1'));
    expect(result).toEqual({ onPhone: true });
    await until(() => expect(uploadOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1' }), expect.anything()));
  });

  it('reports a refused order once, and orders stuck for 10 minutes at most every 5, other accounts’ included', async () => {
    // Only the clock moves: each round is started by the app coming back to the foreground.
    vi.useFakeTimers({ toFake: ['Date'] });
    const later = async (ms: number) => {
      vi.setSystemTime(Date.now() + ms);
      const outbox = result.current;
      document.dispatchEvent(new Event('visibilitychange'));
      await until(() => expect(result.current).not.toBe(outbox));
      await new Promise((resolve) => setTimeout(resolve, 50));
    };
    await orderStore.pendingOrders.save(order('o1', { failed: true, errorCode: 'duplicate_order' }));
    const result = await render();
    await until(() => expect(sendTelemetry).toHaveBeenCalledTimes(1));
    expect(sendTelemetry).toHaveBeenLastCalledWith({ type: 'outbox', waiting: 0, failed: 1, oldestWaitingSec: 0, otherAccounts: 0 });
    await later(15_000);
    expect(sendTelemetry).toHaveBeenCalledTimes(1);

    await orderStore.pendingOrders.save(order('o2', { userId: 'user_b', createdAt: Date.now() - 11 * 60_000 }));
    await later(15_000);
    expect(sendTelemetry).toHaveBeenCalledTimes(2);
    expect(sendTelemetry).toHaveBeenLastCalledWith(expect.objectContaining({ otherAccounts: 1 }));
    await later(4 * 60_000);
    expect(sendTelemetry).toHaveBeenCalledTimes(2);
    await later(60_000);
    expect(sendTelemetry).toHaveBeenCalledTimes(3);
  });

  it('discards a refused order, or takes it back to correct, with a new id when its own belongs to another submission', async () => {
    await orderStore.pendingOrders.save(order('o1', { failed: true, errorCode: 'duplicate_order' }));
    await orderStore.pendingOrders.save(order('o2', { failed: true, errorCode: 'order_conflict' }));
    await orderStore.pendingOrders.save(order('o3', { failed: true, errorCode: 'invalid_input', errorField: 'subtotal' }));
    const outbox = await render();
    await until(() => expect(outbox.current.failed).toHaveLength(3));

    let taken = await outbox.current.takeBack('o1');
    expect(taken).toMatchObject({ id: 'o1', errorCode: 'duplicate_order' });
    taken = await outbox.current.takeBack('o2');
    expect(taken).toMatchObject({ orderNumber: 'o2', errorCode: 'order_conflict' });
    expect(taken!.id).not.toBe('o2');
    const discarded = await outbox.current.discard('o3');
    expect(discarded).toBe(true);
    await until(() => expect(outbox.current.failed).toEqual([]));
    expect(await orderStore.pendingOrders.getAll()).toEqual([]);
  });
});
