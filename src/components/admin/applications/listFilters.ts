import { PLAN_TIERS, SERVICE_KEYS } from '@/config/services';
import { APPLICATION_STATUSES } from '@/lib/applications/status';
import { getPlans, getService, listServices } from '@/lib/services/catalog';
import type {
  ApplicationListFilters,
  ApplicationPlanFilter,
  ApplicationServiceFilter,
  ApplicationSort,
  ApplicationStatusFilter,
} from '@/lib/queries/applications';

/**
 * The applications list keeps its filters in the URL. This module is the one
 * place that reads them (server page) and writes them (client filter bar), so
 * both sides always agree on names, defaults and valid values. Pure — safe to
 * import from server and client code alike.
 */

export const PAGE_SIZE = 20;
export const MAX_SEARCH_LENGTH = 100;
export const SEARCH_DEBOUNCE_MS = 300;

export const STATUS_FILTERS = ['all', ...APPLICATION_STATUSES] as const satisfies readonly ApplicationStatusFilter[];
export const SERVICE_FILTERS = ['all', ...SERVICE_KEYS] as const satisfies readonly ApplicationServiceFilter[];
export const SORT_OPTIONS = ['newest', 'oldest'] as const satisfies readonly ApplicationSort[];

/** Opens the detail drawer for one application, e.g. from the dashboard. */
export const SELECTED_PARAM = 'id';

const PARAM = {
  status: 'status',
  service: 'service',
  plan: 'plan',
  search: 'q',
  sort: 'sort',
  page: 'page',
} as const satisfies Record<keyof ApplicationListFilters, string>;

export const DEFAULT_FILTERS: Readonly<ApplicationListFilters> = {
  status: 'all',
  service: 'all',
  plan: 'all',
  search: '',
  sort: 'newest',
  page: 1,
};

export type ListSearchParams = Partial<Record<string, string | string[] | undefined>>;

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeSearch(value: string): string {
  return value.trim().slice(0, MAX_SEARCH_LENGTH);
}

/**
 * Plan filter choices for a service filter: the tiers its services sell, plus
 * `none` for interest registrations. Services that sell no plans yet (all
 * coming soon) only have interest registrations, so the only choice is `all`.
 */
export function getPlanFilterOptions(service: ApplicationServiceFilter): ApplicationPlanFilter[] {
  const services = service === 'all' ? listServices() : [getService(service)];
  const offered = new Set(services.flatMap((definition) => getPlans(definition).map((plan) => plan.tier)));
  const tiers = PLAN_TIERS.filter((tier) => offered.has(tier));
  return tiers.length > 0 ? ['all', ...tiers, 'none'] : ['all'];
}

/** URL search params → validated filters. Unknown or invalid values fall back to defaults. */
export function parseApplicationListFilters(params: ListSearchParams): ApplicationListFilters {
  const service = pickOption(firstParam(params[PARAM.service]), SERVICE_FILTERS, DEFAULT_FILTERS.service);

  return {
    status: pickOption(firstParam(params[PARAM.status]), STATUS_FILTERS, DEFAULT_FILTERS.status),
    service,
    plan: pickOption(firstParam(params[PARAM.plan]), getPlanFilterOptions(service), DEFAULT_FILTERS.plan),
    search: normalizeSearch(firstParam(params[PARAM.search]) ?? ''),
    sort: pickOption(firstParam(params[PARAM.sort]), SORT_OPTIONS, DEFAULT_FILTERS.sort),
    page: parsePage(firstParam(params[PARAM.page])),
  };
}

/**
 * Next filters after a change. Any change other than the page itself restarts
 * pagination, and a plan the new service does not sell is dropped.
 */
export function applyFilterChanges(
  current: ApplicationListFilters,
  changes: Partial<ApplicationListFilters>
): ApplicationListFilters {
  const next = { ...current, ...changes };
  if (changes.page === undefined) next.page = DEFAULT_FILTERS.page;
  if (!getPlanFilterOptions(next.service).includes(next.plan)) next.plan = DEFAULT_FILTERS.plan;
  return next;
}

/** Filters → query string. Defaults are omitted so URLs stay short and shareable. */
export function toQueryString(filters: ApplicationListFilters): string {
  const params = new URLSearchParams();
  const setUnlessDefault = <K extends keyof ApplicationListFilters>(key: K) => {
    if (filters[key] !== DEFAULT_FILTERS[key]) params.set(PARAM[key], String(filters[key]));
  };
  setUnlessDefault('status');
  setUnlessDefault('service');
  setUnlessDefault('plan');
  setUnlessDefault('search');
  setUnlessDefault('sort');
  setUnlessDefault('page');
  return params.toString();
}

function pickOption<T extends string>(value: string | undefined, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : DEFAULT_FILTERS.page;
}
