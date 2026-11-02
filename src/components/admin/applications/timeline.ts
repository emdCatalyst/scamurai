import { APPLICATION_STATUSES, STATUS_TIMESTAMP_FIELD, type ApplicationStatus } from '@/lib/applications/status';
import type { ApplicationListItem } from '@/lib/queries/applications';

export type TimelineSource = Pick<
  ApplicationListItem,
  'createdAt' | 'quotedAt' | 'paidAt' | 'approvedAt' | 'rejectedAt' | 'paymentReference'
>;

export interface TimelineEntry {
  status: ApplicationStatus;
  at: Date;
  /** Extra fact recorded with the step, e.g. the payment reference. */
  reference: string | null;
}

const STEP_REFERENCE: Partial<Record<ApplicationStatus, (source: TimelineSource) => string | null>> = {
  paid: (source) => source.paymentReference,
};

/**
 * The steps an application actually went through, oldest first, built from the
 * lifecycle timestamps (`createdAt` for submission, STATUS_TIMESTAMP_FIELD for
 * the rest). Steps without a timestamp never happened and are left out.
 */
export function buildTimeline(source: TimelineSource): TimelineEntry[] {
  return APPLICATION_STATUSES.flatMap((status): TimelineEntry[] => {
    const at = status === 'pending' ? source.createdAt : source[STATUS_TIMESTAMP_FIELD[status]];
    if (!at) return [];
    return [{ status, at, reference: STEP_REFERENCE[status]?.(source) ?? null }];
  }).sort((a, b) => a.at.getTime() - b.at.getTime());
}
