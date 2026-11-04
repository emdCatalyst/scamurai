import type { OrderErrorCode, OrderInputField } from '@/lib/orders/errors';
import type { OutboxItem } from '@/lib/outbox';
import { localStore } from './localDb';

/**
 * Delivery orders on the phone: saved before they are uploaded, and the
 * half-filled order form. Neither is lost if the page is closed, reloaded,
 * or killed by the phone while the camera app is open.
 */

export interface PendingOrder extends OutboxItem {
  /** Also the order's id on the server, so a retried upload never duplicates it. */
  id: string;
  brandId: string;
  brandSlug: string;
  orderNumber: string;
  deliveryAppId: string;
  subtotal: string;
  currency: string;
  notes?: string;
  sealedBlob: Blob;
  openedBlob: Blob;
  errorCode?: OrderErrorCode;
  errorField?: OrderInputField;
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

export const pendingOrders = localStore<PendingOrder>('pending_uploads');

const drafts = localStore<OrderDraft>('drafts');

export const orderDrafts = {
  get: drafts.get,
  save: drafts.save,
  remove: drafts.remove,
  /** Deletes a worker's drafts, e.g. when they sign out of a shared phone. */
  async removeAllOf(userId: string): Promise<void> {
    for (const draft of await drafts.getAll()) {
      if (draft.id.startsWith(`${userId}:`)) await drafts.remove(draft.id);
    }
  },
};
