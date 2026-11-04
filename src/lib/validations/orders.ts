import { z } from '@/lib/zod';
import type { OrderInputField } from '@/lib/orders/errors';
import {
  isValidOrderNumber,
  NOTES_MAX_LENGTH,
  normalizeNotes,
  normalizeOrderNumber,
  parseAmount,
} from '@/lib/orders/input';

/**
 * Bodies of the staff order APIs. The phone normalizes what the worker typed
 * before saving an order; the server reads it again with the same functions
 * (src/lib/orders/input.ts) and is the one that decides.
 */

/** An order is a few short fields; anything longer is refused unread. */
export const ORDER_REQUEST_MAX_BYTES = 4 * 1024;
/** The confirm body is two numbers for the logs; anything longer is ignored. */
export const CONFIRM_REQUEST_MAX_BYTES = 1024;

/** Orders are keyed by UUIDs, the phone's own clientOrderId included. */
const orderId = z.uuid();

/** Whether `value` can name an order at all. Checked before it reaches a query or a log line. */
export const isOrderId = (value: string) => orderId.safeParse(value).success;

/** POST /api/orders/upload-urls */
export const uploadUrlsRequestSchema = z.object({
  /** The phone's own id for the order: a retry carrying it resumes the same order. */
  clientOrderId: orderId.optional(),
  orderNumber: z.string().transform(normalizeOrderNumber).refine(isValidOrderNumber, 'Invalid order number'),
  deliveryAppId: z.uuid(),
  subtotal: z.union([z.string(), z.number()]).transform((value, ctx) => {
    const amount = parseAmount(String(value));
    if (amount === null) {
      ctx.addIssue({ code: 'custom', message: 'Invalid amount' });
      return z.NEVER;
    }
    return amount;
  }),
  currency: z.literal('SAR').optional(),
  notes: z.string().transform(normalizeNotes).pipe(z.string().max(NOTES_MAX_LENGTH)).nullish(),
});

/** PATCH /api/orders/[orderId]/confirm: what the phone says about the upload (the save time also dates the order). */
export const confirmRequestSchema = z.object({
  savedAt: z.number().nullish(),
  attempts: z.number().int().min(0).nullish(),
});

const INPUT_FIELDS: readonly OrderInputField[] = ['orderNumber', 'deliveryAppId', 'subtotal', 'currency', 'notes', 'clientOrderId'];

/** The field the first problem is about, so the phone can point at it. */
export function invalidField(error: z.ZodError): OrderInputField | undefined {
  const field = error.issues[0]?.path[0];
  return INPUT_FIELDS.find((name) => name === field);
}

/**
 * Whether the phone saved this order under another account than the one
 * signed in (branch phones are shared): it then waits on the phone for its
 * owner. Checked before anything else in the body.
 */
export function savedByOtherAccount(body: unknown, userId: string): boolean {
  const savedBy = (body as { savedByUserId?: unknown } | null | undefined)?.savedByUserId;
  return typeof savedBy === 'string' && savedBy !== userId;
}

/** Seconds since the phone saved the order. For logs only: phone clocks can be wrong. */
export function waitedSeconds(savedAt: unknown, now = Date.now()): number | undefined {
  return typeof savedAt === 'number' && Number.isFinite(savedAt) && savedAt > 0
    ? Math.max(0, Math.round((now - savedAt) / 1000))
    : undefined;
}

/** Orders are saved before they upload, mostly minutes and at most a few hours before. */
const SAVED_BEFORE_ARRIVAL_MAX_MS = 48 * 60 * 60 * 1000;
/** A phone clock this far ahead of the server still counts as right. */
const CLOCK_AHEAD_MAX_MS = 5 * 60 * 1000;

/**
 * The time finance dates an order by: when the worker saved it on the phone,
 * so an order saved at 23:55 that uploads after midnight belongs to its own
 * day. A phone time outside the believable window (a wrong clock) is not
 * used; the order is then dated by when it first reached the server.
 */
export function orderDate(savedAt: unknown, receivedAt: Date): Date {
  const received = receivedAt.getTime();
  const believable =
    typeof savedAt === 'number' &&
    Number.isFinite(savedAt) &&
    savedAt >= received - SAVED_BEFORE_ARRIVAL_MAX_MS &&
    savedAt <= received + CLOCK_AHEAD_MAX_MS;
  return believable ? new Date(Math.min(savedAt, received)) : receivedAt;
}
