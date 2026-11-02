import type { ComponentType } from 'react';
import type { ApplicationStatus } from '@/lib/applications/status';
import type { ReviewStepProps } from '../actionResult';
import ApproveStep from './ApproveStep';
import ConfirmPaymentStep from './ConfirmPaymentStep';
import MarkQuotedStep from './MarkQuotedStep';

/**
 * The review step that moves an application into each forward status. Which
 * of them is offered is decided by getAllowedTransitions alone; rejection,
 * available from every open status, lives in the drawer footer.
 */
export const NEXT_STEPS = {
  quoted: MarkQuotedStep,
  paid: ConfirmPaymentStep,
  approved: ApproveStep,
} satisfies Partial<Record<ApplicationStatus, ComponentType<ReviewStepProps>>>;

export type NextStepStatus = keyof typeof NEXT_STEPS;

export function isNextStep(status: ApplicationStatus): status is NextStepStatus {
  return Object.hasOwn(NEXT_STEPS, status);
}
