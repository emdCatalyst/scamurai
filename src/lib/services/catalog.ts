import {
  PLAN_TIERS,
  SERVICE_KEYS,
  SERVICE_ORDER,
  SERVICES,
  type LiveService,
  type PlanDefinition,
  type PlanTier,
  type ServiceDefinition,
  type ServiceKey,
} from '@/config/services';

/**
 * Read-only queries over the service catalog. Pure functions — no I/O — so they
 * can run anywhere (RSC, client, edge, tests) and never touch the database.
 */

const REGISTRY: Readonly<Record<ServiceKey, ServiceDefinition>> = SERVICES;

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === 'string' && (SERVICE_KEYS as readonly string[]).includes(value);
}

export function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === 'string' && (PLAN_TIERS as readonly string[]).includes(value);
}

export function getService(key: ServiceKey): ServiceDefinition {
  return REGISTRY[key];
}

export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return SERVICE_ORDER.map(getService).find((service) => service.slug === slug);
}

/** All services in display order. */
export function listServices(): ServiceDefinition[] {
  return SERVICE_ORDER.map(getService);
}

export function isLiveService(service: ServiceDefinition): service is LiveService {
  return service.status === 'live';
}

export function getPlans(service: ServiceDefinition): readonly PlanDefinition[] {
  return isLiveService(service) ? service.plans : [];
}

export function getPlan(service: ServiceDefinition, tier: PlanTier): PlanDefinition | undefined {
  return getPlans(service).find((plan) => plan.tier === tier);
}

/** Lowest advertised monthly price (billed monthly), or `null` when nothing is priced. */
export function getStartingPrice(service: ServiceDefinition): number | null {
  const prices = getPlans(service)
    .map((plan) => plan.pricing?.monthly)
    .filter((price): price is number => typeof price === 'number');
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Largest annual discount across plans, as a whole percentage (e.g. 20). */
export function getMaxAnnualDiscountPercent(service: ServiceDefinition): number | null {
  const discounts = getPlans(service)
    .map((plan) => plan.pricing)
    .filter((pricing): pricing is NonNullable<typeof pricing> => pricing !== null)
    .map((pricing) => Math.round((1 - pricing.annualMonthly / pricing.monthly) * 100));
  return discounts.length > 0 ? Math.max(...discounts) : null;
}
