import { and, asc, count, desc, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { applications } from '@/lib/db/schema';
import { SERVICE_KEYS, type PlanDefinition, type PlanTier, type ServiceKey } from '@/config/services';
import { getPlan, getService, isPlanTier, isServiceKey } from '@/lib/services/catalog';
import { canTransition, isApplicationStatus, type ApplicationStatus } from '@/lib/applications/status';
import { routing, type Locale } from '@/i18n/routing';

/**
 * Data access for the master-admin applications pipeline.
 *
 * The list page costs two parallel queries: one page of rows and one
 * `GROUP BY status` over the same filters minus the status filter. The status
 * tab counts come from the second query, and so does the pagination total
 * (it is simply the count of the selected tab), so no extra COUNT query or
 * `count(*) over()` window is needed and the total stays correct even when the
 * requested page is past the end.
 */

export type ApplicationStatusFilter = ApplicationStatus | 'all';
export type ApplicationServiceFilter = ServiceKey | 'all';
/** `none` matches interest registrations, which have no plan. */
export type ApplicationPlanFilter = PlanTier | 'none' | 'all';
export type ApplicationSort = 'newest' | 'oldest';

export interface ApplicationListFilters {
  status: ApplicationStatusFilter;
  service: ApplicationServiceFilter;
  plan: ApplicationPlanFilter;
  search: string;
  sort: ApplicationSort;
  page: number;
}

/** Everything the list and the detail drawer show — and nothing else. */
export interface ApplicationListItem {
  id: string;
  service: ServiceKey;
  brandName: string;
  contactName: string | null;
  contactEmail: string;
  phone: string | null;
  branchCount: number | null;
  /** `null` for interest registrations (coming-soon services). */
  plan: PlanTier | null;
  locale: Locale;
  status: ApplicationStatus;
  rejectionNote: string | null;
  paymentReference: string | null;
  /** The plan has no fixed limits, so approving needs negotiated branch/user caps. */
  requiresCustomLimits: boolean;
  createdAt: Date;
  quotedAt: Date | null;
  paidAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
}

export type ApplicationStatusCounts = Record<ApplicationStatusFilter, number>;

export interface ApplicationListPage {
  rows: ApplicationListItem[];
  /** Applications matching every filter (the selected status tab's count). */
  total: number;
  /** Page actually returned: clamped to the last page when the requested one is past the end. */
  page: number;
  /** Per-status counts for the current service, plan and search filters. */
  counts: ApplicationStatusCounts;
}

const LIST_COLUMNS = {
  id: applications.id,
  service: applications.service,
  brandName: applications.brandName,
  contactName: applications.contactName,
  contactEmail: applications.contactEmail,
  phone: applications.phone,
  branchCount: applications.branchCount,
  plan: applications.plan,
  locale: applications.locale,
  status: applications.status,
  rejectionNote: applications.rejectionNote,
  paymentReference: applications.paymentReference,
  createdAt: applications.createdAt,
  quotedAt: applications.quotedAt,
  paidAt: applications.paidAt,
  approvedAt: applications.approvedAt,
  rejectedAt: applications.rejectedAt,
};

type ListRow = Pick<typeof applications.$inferSelect, keyof typeof LIST_COLUMNS>;

export async function getApplications(
  filters: ApplicationListFilters,
  pageSize: number
): Promise<ApplicationListPage> {
  const facets = facetConditions(filters);
  const where = and(
    ...facets,
    filters.status === 'all' ? undefined : eq(applications.status, filters.status)
  );

  const [countRows, pageRows] = await Promise.all([
    db
      .select({ status: applications.status, count: count() })
      .from(applications)
      .where(and(...facets))
      .groupBy(applications.status),
    selectPage(where, filters.sort, pageSize, (filters.page - 1) * pageSize),
  ]);

  const counts = toStatusCounts(countRows);
  const total = counts[filters.status];
  const page = Math.min(filters.page, Math.max(1, Math.ceil(total / pageSize)));

  // The requested page is past the end (e.g. its last application was just
  // approved or rejected): serve the last page instead of an empty table. This
  // is the only case that costs a third query.
  const rows =
    pageRows.length === 0 && page < filters.page && total > 0
      ? await selectPage(where, filters.sort, pageSize, (page - 1) * pageSize)
      : pageRows;

  return { rows: rows.flatMap(toListItem), total, page, counts };
}

/**
 * WHERE clause for an optimistic status change: matches the application only
 * while it is still in `from` and its service allows `from → to`. An UPDATE
 * that touches zero rows therefore means someone else changed it first.
 */
export function whereTransitionAllowed(
  id: string,
  from: ApplicationStatus,
  to: ApplicationStatus
): SQL | undefined {
  const services = SERVICE_KEYS.filter((key) => canTransition(from, to, getService(key)));
  return and(
    eq(applications.id, id),
    eq(applications.status, from),
    inArray(applications.service, services)
  );
}

/**
 * Plans without fixed limits (Enterprise) have their branch and user caps
 * negotiated per customer and set when the application is approved.
 */
export function planRequiresCustomLimits(plan: Pick<PlanDefinition, 'limits'>): boolean {
  return plan.limits.maxBranches === null || plan.limits.maxUsers === null;
}

/** Escapes LIKE wildcards so user input is matched literally (`\` is Postgres' default escape). */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Every filter except status: the status tabs count across these. */
function facetConditions({
  service,
  plan,
  search,
}: Pick<ApplicationListFilters, 'service' | 'plan' | 'search'>): SQL[] {
  const conditions: SQL[] = [];

  if (service !== 'all') conditions.push(eq(applications.service, service));

  if (plan === 'none') conditions.push(isNull(applications.plan));
  else if (plan !== 'all') conditions.push(eq(applications.plan, plan));

  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    const matches = or(
      ilike(applications.brandName, pattern),
      ilike(applications.contactName, pattern),
      ilike(applications.contactEmail, pattern),
      ilike(applications.phone, pattern),
      ilike(applications.paymentReference, pattern)
    );
    if (matches) conditions.push(matches);
  }

  return conditions;
}

function selectPage(where: SQL | undefined, sort: ApplicationSort, limit: number, offset: number) {
  // `id` breaks ties so rows never shuffle between pages.
  const order =
    sort === 'oldest'
      ? [asc(applications.createdAt), asc(applications.id)]
      : [desc(applications.createdAt), desc(applications.id)];

  return db
    .select(LIST_COLUMNS)
    .from(applications)
    .where(where)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);
}

function toStatusCounts(rows: readonly { status: string; count: number }[]): ApplicationStatusCounts {
  const counts: ApplicationStatusCounts = {
    all: 0,
    pending: 0,
    quoted: 0,
    paid: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of rows) {
    if (!isApplicationStatus(row.status)) continue;
    counts[row.status] += row.count;
    counts.all += row.count;
  }
  return counts;
}

/**
 * Narrows DB text columns to the catalog's unions. CHECK constraints already
 * guarantee valid values, so the empty branch only guards against drift.
 */
function toListItem(row: ListRow): ApplicationListItem[] {
  if (!isServiceKey(row.service) || !isApplicationStatus(row.status)) return [];

  const plan = isPlanTier(row.plan) ? row.plan : null;
  const definition = plan ? getPlan(getService(row.service), plan) : undefined;

  return [
    {
      ...row,
      service: row.service,
      status: row.status,
      plan,
      locale: routing.locales.find((locale) => locale === row.locale) ?? routing.defaultLocale,
      requiresCustomLimits: definition ? planRequiresCustomLimits(definition) : false,
    },
  ];
}
