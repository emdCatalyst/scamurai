import { withTimeout } from './timeout';

/**
 * The staff app's database on the phone (IndexedDB). Built so a save always
 * ends, either saved or with a reason the screen can show, instead of
 * waiting forever:
 *
 * - An older version of the app open in another tab can block an upgrade:
 *   that fails at once ("blocked"), and saving works again once that tab
 *   closes. Tabs running this code close their connection when a newer
 *   version asks, so they never block one.
 * - A page older than the database (a saved copy, after a newer version
 *   upgraded it) uses the database as it is.
 * - The phone can close the connection (iOS after the app was in the
 *   background, storage cleared): it is opened again and the step tried once more.
 * - Every step has a time limit.
 */

const DB_NAME = 'scamurai_orders';
/** Bump when adding a store, and rarely: every older page open on a phone must then step aside. */
const DB_VERSION = 2;
const STORES = ['pending_uploads', 'drafts'] as const;
export type StoreName = (typeof STORES)[number];

/** Generous: strict-durability writes of two photos can be slow on old phones. */
const TIMEOUT_MS = 8_000;
/** How a dropped connection shows up; the step is retried once on a new one. */
const CONNECTION_LOST = new Set(['InvalidStateError', 'UnknownError']);

/**
 * Why the phone couldn't save: its storage is full ("quota"), an older
 * version of the app in another tab holds the database ("blocked"), it took
 * too long ("timeout"), or IndexedDB doesn't work here ("unavailable").
 */
export type LocalDbProblem = 'quota' | 'blocked' | 'timeout' | 'unavailable';

export class LocalDbError extends Error {
  constructor(
    readonly problem: LocalDbProblem,
    message: string
  ) {
    super(message);
    this.name = 'LocalDbError';
  }
}

const nameOf = (err: unknown) => {
  const name = (err as { name?: unknown } | null)?.name;
  return typeof name === 'string' ? name : '';
};

function toLocalDbError(err: unknown): LocalDbError {
  if (err instanceof LocalDbError) return err;
  const name = nameOf(err);
  return new LocalDbError(name === 'QuotaExceededError' ? 'quota' : 'unavailable', name || 'IndexedDB failed');
}

let connection: IDBDatabase | null = null;
let opening: Promise<IDBDatabase> | null = null;

/** Opens the database at `version`, or at the version it has. `wanted` is false once the open was given up on. */
function open(version: number | undefined, wanted: () => boolean): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = version === undefined ? indexedDB.open(DB_NAME) : indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => {
      // Existing stores and their records are kept: orders saved by older versions still upload.
      const db = request.result;
      for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!wanted()) return db.close();
      if (!STORES.every((name) => db.objectStoreNames.contains(name))) {
        db.close();
        return reject(new LocalDbError('unavailable', 'The database has no order stores'));
      }
      const forget = () => {
        if (connection === db) connection = null;
      };
      // A newer version of the app in another tab needs to upgrade: step aside; the next step reopens.
      db.onversionchange = () => {
        db.close();
        forget();
      };
      // Closed by the browser (storage cleared, iOS after the app was in the background).
      db.onclose = forget;
      connection = db;
      opening = null;
      resolve(db);
    };
    request.onerror = () => {
      // Failed after all, once the other tab let go: the next step opens afresh.
      if (blocked && wanted()) opening = null;
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };
    // An older version of the app in another tab holds the database. Fail now rather than leave
    // Submit spinning; the request stays queued and connects once that tab closes.
    request.onblocked = () => {
      blocked = true;
      reject(new LocalDbError('blocked', 'An older version of the app is open in another tab'));
    };
  });
}

const isBlocked = (err: unknown) => err instanceof LocalDbError && err.problem === 'blocked';

function connect(): Promise<IDBDatabase> {
  if (connection) return Promise.resolve(connection);
  if (opening) return opening;
  const wanted = () => opening === attempt;
  const attempt: Promise<IDBDatabase> = open(DB_VERSION, wanted).catch((err) => {
    // A newer version of the app upgraded the database: this page still works with it.
    if (nameOf(err) === 'VersionError') return open(undefined, wanted);
    throw err;
  });
  opening = attempt;
  // A failed open is started afresh by the next step. A blocked one stays queued, so the
  // next steps fail at once too instead of each waiting out the time limit.
  attempt.catch((err) => {
    if (wanted() && !isBlocked(err)) opening = null;
  });
  return attempt;
}

function transact<T>(
  db: IDBDatabase,
  store: StoreName,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Strict durability: "saved" must mean on disk, even if the phone dies right after.
    const tx = db.transaction(store, mode, { durability: mode === 'readwrite' ? 'strict' : 'default' });
    const request = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result as T);
    // The request's own error first: while its error event runs, the transaction's isn't set yet.
    tx.onerror = () => reject(request.error ?? tx.error ?? new Error('IndexedDB request failed'));
    // Aborted, e.g. the disk filled up while committing: the transaction's error says why.
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/** Runs one request and resolves once its transaction has committed. */
async function run<T>(store: StoreName, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  for (let tries = 1; ; tries++) {
    const attempt = connect();
    let db: IDBDatabase;
    try {
      db = await withTimeout(attempt, TIMEOUT_MS, () => new LocalDbError('timeout', 'Opening IndexedDB took too long'));
    } catch (err) {
      const failure = toLocalDbError(err);
      // An open that never finishes (seen on iOS) is given up on: the next step starts afresh.
      if (failure.problem === 'timeout' && opening === attempt) opening = null;
      throw failure;
    }
    try {
      return await withTimeout(
        transact<T>(db, store, mode, action),
        TIMEOUT_MS,
        () => new LocalDbError('timeout', 'IndexedDB took too long')
      );
    } catch (err) {
      if (tries > 1 || !CONNECTION_LOST.has(nameOf(err))) throw toLocalDbError(err);
      // The connection broke under this step: open a new one and try once more.
      if (connection === db) connection = null;
      db.close();
    }
  }
}

export interface LocalStore<T extends { id: string }> {
  get(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  save(record: T): Promise<void>;
  remove(id: string): Promise<void>;
}

/** One store of the staff database, keyed by `id`. Every call rejects with a LocalDbError. */
export function localStore<T extends { id: string }>(name: StoreName): LocalStore<T> {
  return {
    get: (id) => run<T | undefined>(name, 'readonly', (s) => s.get(id)),
    getAll: () => run<T[]>(name, 'readonly', (s) => s.getAll()),
    save: (record) => run<void>(name, 'readwrite', (s) => s.put(record)),
    remove: (id) => run<void>(name, 'readwrite', (s) => s.delete(id)),
  };
}

let persistAsked = false;

/**
 * Asks the browser not to clear saved orders when the phone runs low on
 * space (Chrome grants it to installed apps without asking). Once per page;
 * never throws.
 */
export function keepSavedData(): void {
  if (persistAsked) return;
  persistAsked = true;
  try {
    const storage = navigator.storage;
    if (!storage?.persist) return;
    void (storage.persisted?.() ?? Promise.resolve(false))
      .then((persisted) => persisted || storage.persist())
      .catch(() => {});
  } catch {
    // Not offered by this browser.
  }
}
