import type { ApplicationListItem } from '@/lib/queries/applications';
import type { ApproveApplicationError } from '@/actions/approveApplication';
import type { ConfirmApplicationPaymentError } from '@/actions/confirmApplicationPayment';
import type { UpdateApplicationStatusError } from '@/actions/updateApplicationStatus';

/** Every error code a review action can return; each is a key in `admin.applications.errors`. */
export type ReviewActionError =
  | UpdateApplicationStatusError
  | ConfirmApplicationPaymentError
  | ApproveApplicationError;

export type ToastTone = 'success' | 'warning';

/** What every review step (quote, payment, approval, rejection) receives from the drawer. */
export interface ReviewStepProps {
  application: ApplicationListItem;
  /** The action succeeded: announce `message`, refresh the list and close the drawer. */
  onCompleted: (message: string, tone?: ToastTone) => void;
  /** The action failed with a code the step does not show inline. */
  onFailed: (error: ReviewActionError) => void;
}

/** Returned when the request itself fails (network error, server crash). */
export const REQUEST_FAILED = { success: false, error: 'failed' } as const;

/** Calls a server action, turning a thrown error into `fallback` so callers only handle results. */
export async function callAction<T>(action: () => Promise<T>, fallback: NoInfer<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    console.error('[applications] Review action request failed:', error);
    return fallback;
  }
}

/** After these errors the drawer shows outdated data, so it is refreshed. */
export function isStaleDataError(error: ReviewActionError): boolean {
  return error === 'conflict' || error === 'notFound';
}
