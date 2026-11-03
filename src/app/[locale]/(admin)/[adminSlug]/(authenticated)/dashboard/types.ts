import type { ServiceKey } from '@/config/services';
import type { ApplicationStatus } from '@/lib/applications/status';

/**
 * Shared by the dashboard page (server) and DashboardClient. Lives outside the
 * 'use client' module on purpose: values exported from a client module reach
 * the server only as client references, not as usable values.
 */

/** Lifecycle statuses plus `interest`: pending requests for services that aren't live yet. */
export type ApplicationBucket = ApplicationStatus | 'interest';

/** Display order of the applications overview. */
export const APPLICATION_BUCKETS: readonly ApplicationBucket[] = [
  'pending',
  'interest',
  'quoted',
  'paid',
  'approved',
  'rejected',
];

export interface DashboardApplication {
  id: string;
  brandName: string;
  service: ServiceKey | null;
  plan: string | null;
  bucket: ApplicationBucket | null;
  /** Already formatted relative time ("2 days ago"). */
  submittedAt: string;
}

export interface DashboardBranch {
  id: string;
  branchName: string;
  brandName: string;
  orderCount: number;
}

export interface DashboardOrderDay {
  /** YYYY-MM-DD (UTC). */
  date: string;
  approved: number;
  rejected: number;
  needsReview: number;
}
