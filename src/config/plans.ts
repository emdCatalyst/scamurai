import { SERVICES, type PlanTier } from './services';

/**
 * Legacy plan limits for the Order Protection (Dispute Orders) brand portal.
 *
 * Derived from the service catalog so limits are defined once. Existing callers
 * (brand limits, branch/user caps, admin limit dialogs) keep this shape;
 * `999` stands for "unlimited" as before.
 */
const UNLIMITED = 999;

function toLegacy(tier: PlanTier) {
  const plan = SERVICES.dispute_orders.plans.find((p) => p.tier === tier);
  if (!plan) throw new Error(`Missing ${tier} plan in SERVICES.dispute_orders`);
  return plan.limits;
}

export const PLANS = {
  starter: {
    max_branches: toLegacy('starter').maxBranches ?? UNLIMITED,
    max_users: toLegacy('starter').maxUsers ?? UNLIMITED,
    label: 'Starter',
  },
  growth: {
    max_branches: toLegacy('growth').maxBranches ?? UNLIMITED,
    max_users: toLegacy('growth').maxUsers ?? UNLIMITED,
    label: 'Growth',
  },
  enterprise: {
    // Enterprise defaults before custom limits are negotiated.
    max_branches: toLegacy('enterprise').maxBranches ?? UNLIMITED,
    max_users: toLegacy('enterprise').maxUsers ?? 50,
    label: 'Enterprise',
  },
} as const;

export type PlanKey = keyof typeof PLANS;
