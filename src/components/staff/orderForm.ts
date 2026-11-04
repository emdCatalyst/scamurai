import type { OrderErrorCode, OrderInputField } from "@/lib/orders/errors";
import { formatAmount, isValidOrderNumber, normalizeNotes, normalizeOrderNumber, parseAmount } from "@/lib/orders/input";
import type { OrderDraft, PendingOrder } from "@/lib/staff/orderStore";

/**
 * The order screen's rules, apart from React: what is still missing before
 * an order can be saved, when a draft is too old to come back unasked, and
 * the order the form saves.
 */

export type Slot = "sealed" | "opened";

/** A refused order being corrected in the form: saved again under its own id and capture time. */
export interface Correction {
  id: string;
  createdAt: number;
  orderNumber: string;
  errorCode?: OrderErrorCode;
  errorField?: OrderInputField;
}

/** The half-filled form as kept on the phone. */
export interface FormDraft extends OrderDraft {
  /** When the worker last changed it (ms). Missing on drafts saved before it was kept. */
  savedAt?: number;
  /** The photo whose camera was open. Still set after a reload: the phone closed the page meanwhile. */
  capturing?: Slot;
  correcting?: Correction;
}

/**
 * A draft this recent comes back by itself, e.g. after the phone closed the
 * page behind the camera. An older one is asked about first: its photos may
 * be of a bag that has long gone.
 */
export const DRAFT_FRESH_MS = 30 * 60_000;
/** A photo file older than this when chosen was probably not taken for the bag at hand. */
export const OLD_PHOTO_MS = 10 * 60_000;

/** Whether a draft holds an order, not just the delivery app that carries over to the next one. */
export function hasOrder(draft: Pick<FormDraft, "orderNumber" | "amount" | "notes" | "sealedBlob" | "openedBlob" | "correcting">): boolean {
  return Boolean(
    draft.orderNumber.trim() || draft.amount.trim() || draft.notes.trim() || draft.sealedBlob || draft.openedBlob || draft.correcting
  );
}

/** Whether a draft may come back unasked. A phone clock moved either way counts as old. */
export function isFresh(draft: FormDraft, now: number): boolean {
  return draft.savedAt !== undefined && Math.abs(now - draft.savedAt) <= DRAFT_FRESH_MS;
}

/** Why the order can't be saved yet: the first thing to do, in the order the form shows them. Also a message key. */
export type MissingItem =
  | "wrongAccount"
  | "noDeliveryApps"
  | "preparingPhoto"
  | "needOpenedPhoto"
  | "needSealedPhoto"
  | "needDeliveryApp"
  | "needOrderNumber"
  | "orderNumberInvalid"
  | "needAmount"
  | "amountInvalid";

export interface FormState {
  wrongAccount: boolean;
  /** A photo is still being shrunk. */
  preparing: boolean;
  opened: boolean;
  sealed: boolean;
  apps: readonly { id: string }[];
  deliveryAppId: string;
  orderNumber: string;
  amount: string;
}

export function missingItem(form: FormState): MissingItem | null {
  if (form.wrongAccount) return "wrongAccount";
  if (form.apps.length === 0) return "noDeliveryApps";
  if (form.preparing) return "preparingPhoto";
  if (!form.opened) return "needOpenedPhoto";
  if (!form.sealed) return "needSealedPhoto";
  // A restored or carried-over app the brand has turned off since doesn't count.
  if (!form.apps.some((app) => app.id === form.deliveryAppId)) return "needDeliveryApp";
  const orderNumber = normalizeOrderNumber(form.orderNumber);
  if (!orderNumber) return "needOrderNumber";
  if (!isValidOrderNumber(orderNumber)) return "orderNumberInvalid";
  if (!form.amount.trim()) return "needAmount";
  if (parseAmount(form.amount) === null) return "amountInvalid";
  return null;
}

/** The amount as it will be saved, when that isn't plainly what was typed ("37,95" is saved as 37.95); else null. */
export function amountPreview(text: string): string | null {
  const amount = parseAmount(text);
  if (amount === null) return null;
  const typed = text.trim();
  return typed === formatAmount(amount) || typed === String(amount) ? null : formatAmount(amount);
}

/** Whether a chosen photo file is clearly older than this moment, e.g. picked from the gallery. */
export function isOldPhoto(lastModified: number, now: number): boolean {
  return Number.isFinite(lastModified) && lastModified > 0 && now - lastModified > OLD_PHOTO_MS;
}

/**
 * The order to save, normalized the way the server reads it
 * (src/lib/orders/input.ts). Null while the amount can't be read.
 */
export function orderFromForm(
  form: { orderNumber: string; amount: string; notes: string; deliveryAppId: string; sealedBlob: Blob; openedBlob: Blob },
  owner: { userId: string; brandId: string; brandSlug: string },
  saved: { id: string; createdAt: number }
): PendingOrder | null {
  const subtotal = parseAmount(form.amount);
  if (subtotal === null) return null;
  return {
    id: saved.id,
    ...owner,
    orderNumber: normalizeOrderNumber(form.orderNumber),
    deliveryAppId: form.deliveryAppId,
    subtotal: formatAmount(subtotal),
    currency: "SAR",
    notes: normalizeNotes(form.notes) || undefined,
    sealedBlob: form.sealedBlob,
    openedBlob: form.openedBlob,
    createdAt: saved.createdAt,
    attempts: 0,
  };
}

/** A refused order loaded into the form for correcting, photos included. */
export function draftFromOrder(order: PendingOrder, draftId: string, now: number): FormDraft {
  return {
    id: draftId,
    orderNumber: order.orderNumber,
    amount: order.subtotal,
    notes: order.notes ?? "",
    deliveryAppId: order.deliveryAppId,
    sealedBlob: order.sealedBlob,
    openedBlob: order.openedBlob,
    savedAt: now,
    correcting: {
      id: order.id,
      createdAt: order.createdAt,
      orderNumber: order.orderNumber,
      errorCode: order.errorCode,
      errorField: order.errorField,
    },
  };
}

/** Refusals that have a `failedReason.*` message; any other is told as "other". */
const EXPLAINED: ReadonlySet<string> = new Set<OrderErrorCode>([
  "duplicate_order",
  "order_conflict",
  "invalid_input",
  "app_unavailable",
  "no_branch",
  "forbidden",
  "not_found",
]);

export const failedReason = (code: string | undefined) => (code && EXPLAINED.has(code) ? code : "other");

/** Refusals the office can clear on its side (a branch, the account, the app): sending again may then work. */
const RETRY_CAN_HELP: ReadonlySet<string> = new Set<OrderErrorCode>(["no_branch", "forbidden", "app_unavailable", "not_found"]);

export const retryCanHelp = (code: string | undefined) => code === undefined || RETRY_CAN_HELP.has(code);

/** The form fields a refusal is about, to point the worker at them. */
export function fieldsToFix(correction: Correction | undefined): ReadonlySet<OrderInputField> {
  if (!correction) return new Set();
  if (correction.errorCode === "duplicate_order") return new Set(["orderNumber", "deliveryAppId"]);
  if (correction.errorCode === "app_unavailable") return new Set(["deliveryAppId"]);
  return new Set(correction.errorField ? [correction.errorField] : []);
}
