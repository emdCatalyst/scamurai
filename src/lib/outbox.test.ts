import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOutbox, retryDelay, type UploadOutcome } from './outbox';
import type { PendingOrder } from './staff/orderStore';

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
  createdAt: Number(id.replace(/\D/g, '')) || 0,
  attempts: 0,
  ...overrides,
});

function memoryStore(initial: PendingOrder[]) {
  const rows = new Map(initial.map((o) => [o.id, o]));
  return {
    rows,
    get: async (id: string) => rows.get(id),
    getAll: async () => [...rows.values()],
    save: async (o: PendingOrder) => void rows.set(o.id, o),
    remove: async (id: string) => void rows.delete(id),
  };
}

type Outcome = UploadOutcome<PendingOrder>;
const sent: Outcome = { status: 'sent' };

describe('outbox', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uploads oldest first and removes what was delivered', async () => {
    const store = memoryStore([order('o2'), order('o1')]);
    const uploaded: string[] = [];
    const outbox = createOutbox({ store, upload: async (o) => (uploaded.push(o.id), sent) });
    await outbox.flush('user_a');
    expect(uploaded).toEqual(['o1', 'o2']);
    expect(store.rows.size).toBe(0);
  });

  it('reports what is still waiting, and since when', async () => {
    const store = memoryStore([order('o5'), order('o3'), order('o9', { failed: true }), order('o7', { userId: 'user_b' })]);
    const outbox = createOutbox({ store, upload: async () => sent });
    expect(await outbox.summary('user_a')).toMatchObject({
      waiting: 2,
      oldestWaitingAt: 3,
      failed: [{ id: 'o9' }],
      otherAccounts: 1,
      oldestOtherAt: 7,
      otherAccountSignedIn: false,
    });
    expect((await outbox.summary('user_b')).oldestWaitingAt).toBe(7);
  });

  it('only sends the signed-in worker’s orders on a shared phone, never one saved without an account', async () => {
    const store = memoryStore([order('o1'), order('o2', { userId: 'user_b' }), order('o3', { userId: undefined as unknown as string })]);
    const uploaded: string[] = [];
    const outbox = createOutbox({ store, upload: async (o) => (uploaded.push(o.id), sent) });
    await outbox.flush('user_a');
    expect(uploaded).toEqual(['o1']);
    expect([...store.rows.keys()]).toEqual(['o2', 'o3']);
    expect((await outbox.summary('user_a')).otherAccounts).toBe(2);
  });

  it('backs off after a network failure and stops for this round', async () => {
    const store = memoryStore([order('o1'), order('o2')]);
    let calls = 0;
    const outbox = createOutbox({
      store,
      now: () => 1_000,
      upload: async (): Promise<Outcome> => (calls++, { status: 'retry', error: 'Network error', code: 'server_error' }),
    });
    await outbox.flush('user_a');
    expect(calls).toBe(1);
    expect(store.rows.get('o1')).toMatchObject({ attempts: 1, failed: false, lastError: 'Network error', errorCode: 'server_error' });
    expect(store.rows.get('o1')!.nextAttemptAt).toBeGreaterThan(1_000);

    await outbox.flush('user_a'); // o1 isn't due yet, so o2 goes (and fails)
    expect(calls).toBe(2);
    await outbox.flush('user_a', { force: true }); // o1 is tried at once, fails, and the round stops
    expect(calls).toBe(3);
  });

  it('does not count a try that never reached the server (offline, session to renew)', async () => {
    const store = memoryStore([order('o1'), order('o2')]);
    let calls = 0;
    const outbox = createOutbox({ store, upload: async (): Promise<Outcome> => (calls++, { status: 'paused', error: 'Offline' }) });
    await outbox.flush('user_a');
    expect(calls).toBe(1);
    expect(store.rows.get('o1')).toEqual(order('o1'));
    await outbox.flush('user_a');
    expect(calls).toBe(2);
  });

  it('parks orders the server refuses for good, with its reason, until retried', async () => {
    const store = memoryStore([order('o1'), order('o2')]);
    let refuse = true;
    const outbox = createOutbox({
      store,
      upload: async (o): Promise<Outcome> =>
        refuse && o.id === 'o1' ? { status: 'rejected', error: 'Invalid amount', code: 'invalid_input', field: 'subtotal' } : sent,
    });
    await outbox.flush('user_a');
    expect(await outbox.summary('user_a')).toMatchObject({
      waiting: 0,
      failed: [{ id: 'o1', lastError: 'Invalid amount', errorCode: 'invalid_input', errorField: 'subtotal', attempts: 1 }],
    });

    refuse = false;
    await outbox.retryFailed('user_a');
    expect(store.rows.get('o1')).toMatchObject({ failed: false, errorCode: undefined, errorField: undefined });
    await outbox.flush('user_a');
    expect(store.rows.size).toBe(0);
  });

  it('leaves orders saved under another account for their owner: not failed, not counted, not tried again', async () => {
    const store = memoryStore([order('o1'), order('o2')]);
    let calls = 0;
    const outbox = createOutbox({ store, upload: async (): Promise<Outcome> => (calls++, { status: 'otherAccount', error: 'Other account' }) });
    await outbox.flush('user_a');
    await outbox.flush('user_a', { force: true });
    expect(calls).toBe(1);
    expect(store.rows.get('o1')).toEqual(order('o1'));
    expect(await outbox.summary('user_a')).toMatchObject({ waiting: 2, failed: [], otherAccountSignedIn: true });
  });

  it('tries an order at once when its next try is implausibly far away (the phone’s clock was moved)', async () => {
    const now = 1_000_000;
    const store = memoryStore([order('o1', { attempts: 3, nextAttemptAt: now + 3 * 3600_000 }), order('o2', { attempts: 1, nextAttemptAt: now + 60_000 })]);
    const uploaded: string[] = [];
    await createOutbox({ store, now: () => now, upload: async (o) => (uploaded.push(o.id), sent) }).flush('user_a');
    expect(uploaded).toEqual(['o1']);
  });

  it('runs one more round for an order saved while a round was uploading', async () => {
    const store = memoryStore([order('o1')]);
    const uploaded: string[] = [];
    let release!: () => void;
    const outbox = createOutbox({
      store,
      upload: async (o) => {
        uploaded.push(o.id);
        if (o.id === 'o1') await new Promise<void>((resolve) => (release = resolve));
        return sent;
      },
    });
    const first = outbox.flush('user_a');
    await vi.waitFor(() => expect(uploaded).toEqual(['o1']));
    await store.save(order('o2'));
    const second = outbox.flush('user_a', { force: true });
    release();
    await Promise.all([first, second]);
    expect(uploaded).toEqual(['o1', 'o2']);
    expect(store.rows.size).toBe(0);
  });

  it('shares one run between concurrent triggers', async () => {
    const store = memoryStore([order('o1')]);
    let calls = 0;
    const outbox = createOutbox({ store, upload: async () => (calls++, sent) });
    await Promise.all([outbox.flush('user_a'), outbox.flush('user_a'), outbox.flush('user_a')]);
    expect(calls).toBe(1);
  });

  it('gives up on an upload that hangs, and cancels it', async () => {
    const store = memoryStore([order('o1')]);
    let signal: AbortSignal | undefined;
    const outbox = createOutbox({
      store,
      watchdogMs: 20,
      upload: (_o, s) => ((signal = s), new Promise<Outcome>(() => {})),
    });
    await outbox.flush('user_a');
    expect(signal?.aborted).toBe(true);
    expect(store.rows.get('o1')).toMatchObject({ attempts: 1, lastError: 'Upload took too long' });
  });

  it('does not write back an order another tab sent while this one was trying', async () => {
    const store = memoryStore([order('o1')]);
    const outbox = createOutbox({
      store,
      upload: async (o): Promise<Outcome> => (store.rows.delete(o.id), { status: 'retry', error: 'Timed out' }),
    });
    await outbox.flush('user_a');
    expect(store.rows.size).toBe(0);
  });

  it('skips the round while another tab holds the upload lock, without waiting for it', async () => {
    const held = new Set<string>();
    vi.stubGlobal('navigator', {
      locks: {
        request: async (name: string, _options: unknown, task: (lock: object | null) => Promise<void>) => {
          if (held.has(name)) return task(null);
          held.add(name);
          try {
            return await task({ name });
          } finally {
            held.delete(name);
          }
        },
      },
    });
    const store = memoryStore([order('o1')]);
    let calls = 0;
    const outbox = createOutbox({ store, lockName: 'orders', upload: async () => (calls++, sent) });

    held.add('orders'); // another tab is uploading
    await outbox.flush('user_a');
    expect(calls).toBe(0);
    held.delete('orders');
    await outbox.flush('user_a');
    expect(calls).toBe(1);
  });

  it('discards or takes back only the worker’s own refused orders', async () => {
    const store = memoryStore([
      order('o1', { failed: true }),
      order('o2'),
      order('o3', { failed: true, userId: 'user_b' }),
      order('o4', { failed: true, errorCode: 'duplicate_order' }),
    ]);
    const outbox = createOutbox({ store, upload: async () => sent });
    expect(await outbox.discard('user_a', 'o2')).toBe(false);
    expect(await outbox.discard('user_a', 'o3')).toBe(false);
    expect(await outbox.discard('user_a', 'o1')).toBe(true);
    expect(await outbox.takeBack('user_a', 'o3')).toBeUndefined();
    expect(await outbox.takeBack('user_a', 'o4')).toMatchObject({ id: 'o4', errorCode: 'duplicate_order' });
    expect([...store.rows.keys()]).toEqual(['o2', 'o3']);
  });

  it('spaces retries out up to five minutes', () => {
    const mid = () => 0.5;
    expect(retryDelay(1, mid)).toBe(5_000);
    expect(retryDelay(3, mid)).toBe(20_000);
    expect(retryDelay(20, mid)).toBe(300_000);
  });
});
