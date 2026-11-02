import { DEFAULT_SERVICE_KEY, type PlanTier, type ServiceKey } from '@/config/services';
import { getPlan, getService, isPlanTier, isServiceKey } from '@/lib/services/catalog';

/**
 * What the visitor has chosen so far. It travels in the URL as
 * `/apply?service=<key>&plan=<tier>`, so service pages can deep-link into the
 * form and a reload keeps the choice.
 */
export interface Selection {
  service?: ServiceKey;
  plan?: PlanTier;
}

const SERVICE_PARAM = 'service';
const PLAN_PARAM = 'plan';

function resolveService(rawService: string | null, rawPlan: string | null): ServiceKey | undefined {
  if (rawService !== null) return isServiceKey(rawService) ? rawService : undefined;
  // Links from before the multi-service catalog carry only `?plan=`; they always meant the default service.
  return isPlanTier(rawPlan) ? DEFAULT_SERVICE_KEY : undefined;
}

/**
 * Reads a preselection from query parameters, keeping only what the catalog
 * offers: unknown services are ignored, and a plan only counts when that
 * service sells it (coming-soon services have no plans).
 */
export function parseSelection(params: Pick<URLSearchParams, 'get'>): Selection {
  const rawPlan = params.get(PLAN_PARAM);
  const service = resolveService(params.get(SERVICE_PARAM), rawPlan);
  if (!service) return {};

  const plan = isPlanTier(rawPlan) && getPlan(getService(service), rawPlan) ? rawPlan : undefined;
  return plan ? { service, plan } : { service };
}

/**
 * `href` with the selection written into its query string. Other parameters
 * (e.g. utm_* campaign tags) are kept; a plan is only written with a service.
 */
export function withSelection(href: string, { service, plan }: Selection): string {
  const url = new URL(href);
  url.searchParams.delete(SERVICE_PARAM);
  url.searchParams.delete(PLAN_PARAM);
  if (service) {
    url.searchParams.set(SERVICE_PARAM, service);
    if (plan) url.searchParams.set(PLAN_PARAM, plan);
  }
  return url.toString();
}
