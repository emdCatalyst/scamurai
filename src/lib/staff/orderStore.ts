import { localStore } from './localDb';

/**
 * Delivery orders on the phone: saved before they are uploaded, and the
 * half-filled order form. Neither is lost if the page is closed, reloaded,
 * or killed by the phone while the camera app is open.
 */

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

export const pendingOrders = localStore<PendingOrder>('pending_uploads');

export const orderDrafts = localStore<OrderDraft>('drafts');
