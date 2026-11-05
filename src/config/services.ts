/**
 * Service catalog — the single source of truth for every product Misdaq sells.
 *
 * Adding a service = adding one entry here (plus its copy under
 * `messages/<locale>/services.json`). Every page, form, validation rule and
 * admin filter reads from this registry, so nothing else needs to change to
 * list, price or accept applications for a new service.
 *
 * This module is pure data with no React, DB or framework imports, so it is
 * safe to import from server code, client components, drizzle schema and tests.
 */

export const SERVICE_KEYS = ['dispute_orders', 'compliance', 'receiving'] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

export const PLAN_TIERS = ['starter', 'growth', 'enterprise'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

/** `live` services can be bought; `coming_soon` services only collect interest. */
export type ServiceStatus = 'live' | 'coming_soon';

/** Product colour from the Misdaq guide, used to tell services apart (cards, badges, admin chips). */
export type ServiceAccent = 'orange' | 'cobalt' | 'yellow';
export type ServiceIconName = 'shield-check' | 'clipboard-check' | 'package-check';
export type SupportLevel = 'email' | 'priority' | 'dedicated';

export const PRICING_CURRENCY = 'SAR';

export interface PlanLimits {
  /** `null` = unlimited / negotiated per contract. */
  maxBranches: number | null;
  maxUsers: number | null;
  /** How long records are retained. `null` = unlimited. */
  historyDays: number | null;
}

export interface PlanPricing {
  /** Monthly price, billed monthly (SAR). */
  monthly: number;
  /** Effective monthly price when billed annually (SAR). */
  annualMonthly: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  /** `null` = "contact sales" (custom quote). */
  pricing: PlanPricing | null;
  limits: PlanLimits;
  support: SupportLevel;
  featured?: boolean;
}

interface BaseService {
  key: ServiceKey;
  /** URL segment under `/services/` — stable, lowercase, hyphenated. */
  slug: string;
  accent: ServiceAccent;
  icon: ServiceIconName;
}

export interface LiveService extends BaseService {
  status: 'live';
  plans: readonly PlanDefinition[];
}

export interface ComingSoonService extends BaseService {
  status: 'coming_soon';
}

export type ServiceDefinition = LiveService | ComingSoonService;

export const SERVICES = {
  dispute_orders: {
    key: 'dispute_orders',
    slug: 'order-protection',
    status: 'live',
    accent: 'orange',
    icon: 'shield-check',
    plans: [
      {
        tier: 'starter',
        pricing: { monthly: 299, annualMonthly: 239 },
        limits: { maxBranches: 3, maxUsers: 10, historyDays: 90 },
        support: 'email',
      },
      {
        tier: 'growth',
        pricing: { monthly: 799, annualMonthly: 639 },
        limits: { maxBranches: 10, maxUsers: 30, historyDays: 365 },
        support: 'priority',
        featured: true,
      },
      {
        tier: 'enterprise',
        pricing: null,
        // Enterprise limits are negotiated and set per brand at approval time.
        limits: { maxBranches: null, maxUsers: null, historyDays: null },
        support: 'dedicated',
      },
    ],
  },
  compliance: {
    key: 'compliance',
    slug: 'operations-compliance',
    status: 'coming_soon',
    accent: 'cobalt',
    icon: 'clipboard-check',
  },
  receiving: {
    key: 'receiving',
    slug: 'receiving-proof',
    status: 'coming_soon',
    accent: 'yellow',
    icon: 'package-check',
  },
} as const satisfies Record<ServiceKey, ServiceDefinition>;

/** Display order across the site. */
export const SERVICE_ORDER: readonly ServiceKey[] = ['dispute_orders', 'compliance', 'receiving'];

/** The service every pre-catalog application and brand belongs to. */
export const DEFAULT_SERVICE_KEY: ServiceKey = 'dispute_orders';
