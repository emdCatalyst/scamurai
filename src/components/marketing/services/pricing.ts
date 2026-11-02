import type { PlanDefinition, PlanPricing, SupportLevel } from '@/config/services';

/**
 * Pure pricing helpers for the plan cards. Prices and limits come only from the
 * service catalog; these functions turn them into display values and message
 * keys in the `plans` namespace. No React or next-intl, so they are unit-tested.
 */

/** Billing periods offered by the pricing toggle, in display order. */
export const BILLING_PERIODS = ['monthly', 'annual'] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/**
 * Whole-riyal amount for the locale, always with Latin digits so prices read
 * the same as the rest of the Arabic copy (e.g. "2,868" in both locales).
 */
export function formatAmount(locale: string, amount: number): string {
  return new Intl.NumberFormat(locale, { numberingSystem: 'latn', maximumFractionDigits: 0 }).format(amount);
}

export interface AnnualBilling {
  /** Amount billed once a year. */
  total: number;
  /** Saving over twelve monthly payments. */
  savings: number;
}

export function getAnnualBilling(pricing: PlanPricing): AnnualBilling {
  const total = pricing.annualMonthly * 12;
  return { total, savings: pricing.monthly * 12 - total };
}

type LimitName = 'branches' | 'users' | 'history';

export type PlanFeature =
  | { key: `limits.${Exclude<LimitName, 'history'>}`; values: { count: number } }
  | { key: 'limits.history'; values: { days: number } }
  | { key: `limits.${LimitName}Unlimited` | `supportLevel.${SupportLevel}`; values?: undefined };

/** Feature lines for a plan card, derived from the catalog limits (`null` = unlimited). */
export function getPlanFeatures(plan: PlanDefinition): PlanFeature[] {
  const { maxBranches, maxUsers, historyDays } = plan.limits;
  return [
    maxBranches === null
      ? { key: 'limits.branchesUnlimited' }
      : { key: 'limits.branches', values: { count: maxBranches } },
    maxUsers === null ? { key: 'limits.usersUnlimited' } : { key: 'limits.users', values: { count: maxUsers } },
    historyDays === null
      ? { key: 'limits.historyUnlimited' }
      : { key: 'limits.history', values: { days: historyDays } },
    { key: `supportLevel.${plan.support}` },
  ];
}
