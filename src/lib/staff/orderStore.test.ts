import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type OrderStore = typeof import('./orderStore');
let store: OrderStore;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  store = await import('./orderStore');
});

afterEach(() => vi.unstubAllGlobals());

const draft = (id: string) => ({ id, orderNumber: '1', amount: '', notes: '', deliveryAppId: '' });

describe('orderStore', () => {
  it('keeps an order’s photos on the phone', async () => {
    const order = {
      id: store.newOrderId(),
      userId: 'user_a',
      brandId: 'b',
      brandSlug: 'demo',
      orderNumber: 'A-1',
      deliveryAppId: 'app',
      subtotal: '10.00',
      currency: 'SAR',
      sealedBlob: new Blob(['sealed']),
      openedBlob: new Blob(['opened']),
      createdAt: 1,
      attempts: 0,
    };
    await store.pendingOrders.save(order);
    const [saved] = await store.pendingOrders.getAll();
    expect(saved).toMatchObject({ id: order.id, userId: 'user_a' });
    expect(await saved.sealedBlob.text()).toBe('sealed');
  });

  it('deletes only the signing-out worker’s drafts', async () => {
    await store.orderDrafts.save(draft('user_a:demo'));
    await store.orderDrafts.save(draft('user_a:other-brand'));
    await store.orderDrafts.save(draft('user_ab:demo'));
    await store.orderDrafts.removeAllOf('user_a');
    expect(await store.orderDrafts.get('user_a:demo')).toBeUndefined();
    expect(await store.orderDrafts.get('user_a:other-brand')).toBeUndefined();
    expect(await store.orderDrafts.get('user_ab:demo')).toEqual(draft('user_ab:demo'));
  });

  it('makes v4 order ids also where crypto.randomUUID is missing (iOS before 15.4)', () => {
    const realCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => realCrypto.getRandomValues(bytes) });
    expect(store.newOrderId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
