import type { ServiceDefinition } from '@/config/services';

/**
 * Application lifecycle — the only place that decides which status changes are
 * legal. Server actions enforce it; admin UI uses it to decide which buttons to
 * show, so the two can never disagree.
 *
 *   pending ──► quoted ──► paid ──► approved
 *      │           │         │
 *      └───────────┴─────────┴────► rejected
 */

export const APPLICATION_STATUSES = ['pending', 'quoted', 'paid', 'approved', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses an admin still has to act on. */
export const OPEN_APPLICATION_STATUSES = ['pending', 'quoted', 'paid'] as const satisfies readonly ApplicationStatus[];

const TRANSITIONS: Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>> = {
  pending: ['quoted', 'rejected'],
  quoted: ['paid', 'rejected'],
  paid: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

/** Column that records when an application entered each non-initial status. */
export const STATUS_TIMESTAMP_FIELD = {
  quoted: 'quotedAt',
  paid: 'paidAt',
  approved: 'approvedAt',
  rejected: 'rejectedAt',
} as const satisfies Record<Exclude<ApplicationStatus, 'pending'>, string>;

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function isTerminalStatus(status: ApplicationStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/**
 * Next statuses allowed from `from`. Applications for services that are not
 * live yet (waitlist / interest registrations) can only be rejected — they
 * cannot be quoted, paid or approved until the service launches.
 */
export function getAllowedTransitions(
  from: ApplicationStatus,
  service: Pick<ServiceDefinition, 'status'>
): readonly ApplicationStatus[] {
  const next = TRANSITIONS[from];
  return service.status === 'live' ? next : next.filter((status) => status === 'rejected');
}

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  service: Pick<ServiceDefinition, 'status'>
): boolean {
  return getAllowedTransitions(from, service).includes(to);
}
