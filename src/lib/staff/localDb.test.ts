import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type LocalDb = typeof import('./localDb');
let localDb: LocalDb;

beforeEach(async () => {
  // A phone with nothing saved yet, and a page that hasn't connected yet.
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  localDb = await import('./localDb');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Another tab, running another version of the app. */
function openElsewhere(version: number, upgrade?: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('scamurai_orders', version);
    request.onupgradeneeded = () => upgrade?.(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe('localStore', () => {
  it('saves, reads and deletes records, each store on its own', async () => {
    const orders = localDb.localStore<{ id: string; n: number }>('pending_uploads');
    const drafts = localDb.localStore<{ id: string; n: number }>('drafts');
    await orders.save({ id: 'a', n: 1 });
    await drafts.save({ id: 'a', n: 2 });
    expect(await orders.get('a')).toEqual({ id: 'a', n: 1 });
    expect(await orders.getAll()).toEqual([{ id: 'a', n: 1 }]);
    await orders.remove('a');
    expect(await orders.get('a')).toBeUndefined();
    expect(await drafts.getAll()).toEqual([{ id: 'a', n: 2 }]);
  });

  it('keeps the orders an older version saved when it upgrades the database', async () => {
    const old = await openElsewhere(1, (db) => db.createObjectStore('pending_uploads', { keyPath: 'id' }).put({ id: 'old' }));
    old.close();
    expect(await localDb.localStore('pending_uploads').getAll()).toEqual([{ id: 'old' }]);
    expect(await localDb.localStore('drafts').getAll()).toEqual([]);
  });

  it('fails at once while an older version in another tab blocks the upgrade, and saves once that tab closes', async () => {
    // Like the previous build: no versionchange handler, so it never lets go by itself.
    const old = await openElsewhere(1, (db) => db.createObjectStore('pending_uploads', { keyPath: 'id' }));
    const orders = localDb.localStore<{ id: string }>('pending_uploads');
    await expect(orders.save({ id: 'a' })).rejects.toMatchObject({ name: 'LocalDbError', problem: 'blocked' });
    // Still queued: the next step fails at once instead of waiting out its time limit.
    await expect(orders.get('a')).rejects.toMatchObject({ problem: 'blocked' });

    old.close();
    await vi.waitFor(() => orders.save({ id: 'a' }));
    expect(await orders.get('a')).toEqual({ id: 'a' });
  });

  it('steps aside for a newer version in another tab, then works with the upgraded database', async () => {
    const orders = localDb.localStore<{ id: string }>('pending_uploads');
    await orders.save({ id: 'a' });
    // Not blocked: this page closes its connection when asked.
    const newer = await openElsewhere(3, (db) => db.createObjectStore('receiving', { keyPath: 'id' }));
    newer.close();
    expect(await orders.get('a')).toEqual({ id: 'a' });
    await orders.save({ id: 'b' });
    expect(await orders.getAll()).toHaveLength(2);
  });

  it('reopens a connection the phone closed, and tries the step once more', async () => {
    const orders = localDb.localStore<{ id: string }>('pending_uploads');
    await orders.save({ id: 'a' });
    const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(() => {
      throw new DOMException('The database connection is closing.', 'InvalidStateError');
    });
    expect(await orders.get('a')).toEqual({ id: 'a' });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('says when the phone is full, however the browser reports it', async () => {
    const full = new DOMException('Quota exceeded', 'QuotaExceededError');
    /** A transaction whose one request then fails as `fail` says. */
    const failing = (fail: (tx: Partial<IDBTransaction>, request: { error: DOMException | null }) => void) => () => {
      const request = { error: null as DOMException | null, result: undefined };
      const tx: Partial<IDBTransaction> = { error: null, objectStore: () => ({ put: () => (setTimeout(() => fail(tx, request)), request) }) as never };
      return tx as IDBTransaction;
    };
    const orders = localDb.localStore<{ id: string }>('pending_uploads');
    await orders.getAll();

    // The request's error event: the transaction has no error of its own yet.
    vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(
      failing((tx, request) => {
        request.error = full;
        tx.onerror?.call(tx as IDBTransaction, new Event('error'));
      })
    );
    await expect(orders.save({ id: 'a' })).rejects.toMatchObject({ name: 'LocalDbError', problem: 'quota' });

    // Committing failed: only the transaction says why.
    vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(
      failing((tx) => {
        (tx as { error: DOMException }).error = full;
        tx.onabort?.call(tx as IDBTransaction, new Event('abort'));
      })
    );
    await expect(orders.save({ id: 'b' })).rejects.toMatchObject({ problem: 'quota' });
  });

  it('gives up on a database that never opens, and opens afresh next time', async () => {
    const open = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => ({}) as IDBOpenDBRequest);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const orders = localDb.localStore<{ id: string }>('pending_uploads');
    const saving = expect(orders.save({ id: 'a' })).rejects.toMatchObject({ problem: 'timeout' });
    await vi.advanceTimersByTimeAsync(8_000);
    await saving;

    vi.useRealTimers();
    await orders.save({ id: 'a' });
    expect(open).toHaveBeenCalledTimes(2);
  });
});

describe('keepSavedData', () => {
  it('asks the browser once to keep the phone’s saved orders', async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal('navigator', { storage: { persisted: async () => false, persist } });
    localDb.keepSavedData();
    localDb.keepSavedData();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
  });

  it('never throws where the browser lacks it', () => {
    vi.stubGlobal('navigator', {});
    expect(() => localDb.keepSavedData()).not.toThrow();
  });
});
