import { describe, expect, it } from 'vitest';
import type { PendingOrder } from './imageQueue';
import { createOutbox, retryDelay, type UploadOutcome } from './outbox';

const order = (id: string, overrides: Partial<PendingOrder> = {}): PendingOrder => ({
  id,
  userId: 'user_a',
  brandId: 'b',
  brandSlug: 'demo',
  orderNumber: id,
  deliveryAppId: 'app',
  subtotal: '10',
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
    getAll: async () => [...rows.values()],
    save: async (o: PendingOrder) => void rows.set(o.id, o),
    remove: async (id: string) => void rows.delete(id),
  };
}

describe('outbox', () => {
  it('uploads oldest first and removes what was delivered', async () => {
    const store = memoryStore([order('o2'), order('o1')]);
    const sent: string[] = [];
    const outbox = createOutbox({ store, upload: async (o) => (sent.push(o.id), { ok: true }) });
    await outbox.flush('user_a');
    expect(sent).toEqual(['o1', 'o2']);
    expect(store.rows.size).toBe(0);
  });

  it('only sends the signed-in worker’s orders on a shared phone', async () => {
    const store = memoryStore([order('o1'), order('o2', { userId: 'user_b' })]);
    const sent: string[] = [];
    await createOutbox({ store, upload: async (o) => (sent.push(o.id), { ok: true }) }).flush('user_a');
    expect(sent).toEqual(['o1']);
    expect([...store.rows.keys()]).toEqual(['o2']);
  });

  it('backs off after a network failure and stops for this round', async () => {
    const store = memoryStore([order('o1'), order('o2')]);
    let calls = 0;
    const outbox = createOutbox({
      store,
      now: () => 1_000,
      upload: async (): Promise<UploadOutcome> => (calls++, { ok: false, retry: true, error: 'offline' }),
    });
    await outbox.flush('user_a');
    expect(calls).toBe(1);
    expect(store.rows.get('o1')).toMatchObject({ attempts: 1, failed: false, lastError: 'offline' });
    expect(store.rows.get('o1')!.nextAttemptAt).toBeGreaterThan(1_000);

    await outbox.flush('user_a'); // o1 isn't due yet, so o2 goes (and fails)
    expect(calls).toBe(2);
    await outbox.flush('user_a', { force: true }); // o1 is tried at once, fails, and the round stops
    expect(calls).toBe(3);
  });

  it('parks orders the server rejects for good, until retried', async () => {
    const store = memoryStore([order('o1'), order('o2')]);
    let reject = true;
    const outbox = createOutbox({
      store,
      upload: async (o): Promise<UploadOutcome> =>
        reject && o.id === 'o1' ? { ok: false, retry: false, error: 'duplicate' } : { ok: true },
    });
    await outbox.flush('user_a');
    expect(await outbox.summary('user_a')).toMatchObject({ waiting: 0, failed: [{ id: 'o1', lastError: 'duplicate' }] });

    reject = false;
    await outbox.retryFailed('user_a');
    await outbox.flush('user_a');
    expect(store.rows.size).toBe(0);
  });

  it('shares one run between concurrent triggers', async () => {
    const store = memoryStore([order('o1')]);
    let calls = 0;
    const outbox = createOutbox({ store, upload: async () => (calls++, { ok: true }) });
    await Promise.all([outbox.flush('user_a'), outbox.flush('user_a'), outbox.flush('user_a')]);
    expect(calls).toBe(1);
  });

  it('spaces retries out up to five minutes', () => {
    const mid = () => 0.5;
    expect(retryDelay(1, mid)).toBe(5_000);
    expect(retryDelay(3, mid)).toBe(20_000);
    expect(retryDelay(20, mid)).toBe(300_000);
  });
});
