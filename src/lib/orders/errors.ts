/**
 * Why an order API refused a request. The order APIs answer
 * `{ error, code }`; the phone reads `code` to decide whether to try again
 * later and which reason to show the worker.
 */
export type OrderErrorCode =
  /** 401: the session expired; Clerk refreshes it and the phone tries again. */
  | 'unauthenticated'
  /** 403: not a staff account of a brand. */
  | 'forbidden'
  /** 403: the staff member has no branch yet. */
  | 'no_branch'
  /** 400: a field is missing or invalid; `field` names it. */
  | 'invalid_input'
  /** 400: the delivery app isn't enabled for the brand (any more). */
  | 'app_unavailable'
  /** 409: this order number was already submitted for the branch and delivery app. */
  | 'duplicate_order'
  /** 409: the phone's order id belongs to another submission. */
  | 'order_conflict'
  /** 409: the order was saved on this phone by another account; it waits for that worker. */
  | 'other_account'
  /** 404 */
  | 'not_found'
  /** 422: a photo didn't arrive; the next attempt uploads it again. */
  | 'photos_missing'
  /** 429 */
  | 'rate_limited'
  /** 5xx */
  | 'server_error';

export type OrderInputField = 'orderNumber' | 'deliveryAppId' | 'subtotal' | 'currency' | 'notes' | 'clientOrderId';

export interface OrderErrorBody {
  error: string;
  code: OrderErrorCode;
  field?: OrderInputField;
}

export const ORDER_ERROR_STATUS: Record<OrderErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  no_branch: 403,
  invalid_input: 400,
  app_unavailable: 400,
  duplicate_order: 409,
  order_conflict: 409,
  other_account: 409,
  not_found: 404,
  photos_missing: 422,
  rate_limited: 429,
  server_error: 500,
};

/** Worth trying again later without the worker changing anything. */
export const RETRYABLE_ORDER_ERRORS: ReadonlySet<OrderErrorCode> = new Set([
  'unauthenticated',
  'photos_missing',
  'rate_limited',
  'server_error',
]);

/** The code of an error answer, also for answers without one (older servers, proxies, timeouts). */
export function orderErrorCode(status: number, body: unknown): OrderErrorCode {
  const code = (body as Partial<OrderErrorBody> | null)?.code;
  if (typeof code === 'string' && code in ORDER_ERROR_STATUS) return code as OrderErrorCode;
  if (status === 401) return 'unauthenticated';
  if (status === 408 || status >= 500) return 'server_error';
  if (status === 429) return 'rate_limited';
  if (status === 422) return 'photos_missing';
  if (status === 404) return 'not_found';
  if (status === 403) return 'forbidden';
  if (status === 409) return 'duplicate_order';
  return 'invalid_input';
}
