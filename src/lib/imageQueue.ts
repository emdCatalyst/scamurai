/**
 * The phone's outbox, in IndexedDB: orders saved before they are uploaded,
 * and the half-filled order form. Neither is lost if the page is closed,
 * reloaded, or killed by the phone while the camera app is open.
 */

const DB_NAME = 'scamurai_orders';
const DB_VERSION = 2;
const ORDERS = 'pending_uploads';
const DRAFTS = 'drafts';

export interface PendingOrder {
  /** Also the order's id on the server, so a retried upload never duplicates it. */
  id: string;
  /** Clerk user id of the staff member who submitted it: branch phones are shared. */
  userId: string;
  brandId: string;
  brandSlug: string;
  orderNumber: string;
  deliveryAppId: string;
  subtotal: string;
  currency: string;
  notes?: string;
  sealedBlob: Blob;
  openedBlob: Blob;
  createdAt: number;
  attempts: number;
  nextAttemptAt?: number;
  /** Rejected for good (e.g. a duplicate order number); kept so the worker sees it. */
  failed?: boolean;
  lastError?: string;
}

export interface OrderDraft {
  /** `${userId}:${brandSlug}` */
  id: string;
  orderNumber: string;
  amount: string;
  notes: string;
  deliveryAppId: string;
  sealedBlob?: Blob;
  openedBlob?: Blob;
}

/** A v4 UUID; also on older phones without crypto.randomUUID (iOS before 15.4). */
export function newOrderId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ORDERS)) db.createObjectStore(ORDERS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opening = null;
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };
  });
  return opening;
}

/** Runs one request and resolves once its transaction has committed. */
async function run<T>(store: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    // Strict durability: "saved" must mean on disk, even if the phone dies right after.
    const tx = db.transaction(store, mode, { durability: mode === 'readwrite' ? 'strict' : 'default' });
    const request = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result as T);
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}

export const pendingOrders = {
  save: (order: PendingOrder) => run<void>(ORDERS, 'readwrite', (s) => s.put(order)),
  getAll: () => run<PendingOrder[]>(ORDERS, 'readonly', (s) => s.getAll()),
  remove: (id: string) => run<void>(ORDERS, 'readwrite', (s) => s.delete(id)),
};

export const orderDrafts = {
  get: (id: string) => run<OrderDraft | undefined>(DRAFTS, 'readonly', (s) => s.get(id)),
  save: (draft: OrderDraft) => run<void>(DRAFTS, 'readwrite', (s) => s.put(draft)),
  remove: (id: string) => run<void>(DRAFTS, 'readwrite', (s) => s.delete(id)),
};
