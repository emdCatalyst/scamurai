/**
 * IndexedDB utility for queuing orders and images for background upload.
 * Provides offline resilience and retry logic.
 */

const DB_NAME = 'scamurai_orders';
const DB_VERSION = 1;
const STORE_NAME = 'pending_uploads';

export interface PendingOrder {
  id: string; // Internal local ID
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
  lastError?: string;
}

class ImageQueue {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    });
  }

  async enqueue(order: PendingOrder): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(order);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to enqueue order'));
    });
  }

  async getPending(): Promise<PendingOrder[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to fetch pending orders'));
    });
  }

  async update(order: PendingOrder): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(order);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to update order'));
    });
  }

  async remove(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove order'));
    });
  }
}

export const imageQueue = new ImageQueue();
