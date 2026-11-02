import { describe, expect, it } from 'vitest';
import type { PlanDefinition, PlanLimits, SupportLevel } from '@/config/services';
import { formatAmount, getAnnualBilling, getPlanFeatures } from './pricing';

function plan(limits: PlanLimits, support: SupportLevel = 'email'): PlanDefinition {
  return { tier: 'starter', pricing: null, limits, support };
}

describe('formatAmount', () => {
  it('groups thousands with Latin digits in both locales', () => {
    expect(formatAmount('en', 2868)).toBe('2,868');
    expect(formatAmount('ar', 2868)).toBe('2,868');
    expect(formatAmount('ar', 299)).toBe('299');
  });

  it('rounds to whole riyals', () => {
    expect(formatAmount('en', 239.4)).toBe('239');
  });
});

describe('getAnnualBilling', () => {
  it('bills twelve discounted months once a year', () => {
    expect(getAnnualBilling({ monthly: 299, annualMonthly: 239 })).toEqual({ total: 2868, savings: 720 });
  });
});

describe('getPlanFeatures', () => {
  it('turns catalog limits into counted feature lines', () => {
    expect(getPlanFeatures(plan({ maxBranches: 3, maxUsers: 10, historyDays: 90 }))).toEqual([
      { key: 'limits.branches', values: { count: 3 } },
      { key: 'limits.users', values: { count: 10 } },
      { key: 'limits.history', values: { days: 90 } },
      { key: 'supportLevel.email' },
    ]);
  });

  it('uses the unlimited variants for null limits', () => {
    const keys = getPlanFeatures(plan({ maxBranches: null, maxUsers: null, historyDays: null }, 'dedicated')).map(
      (feature) => feature.key
    );
    expect(keys).toEqual([
      'limits.branchesUnlimited',
      'limits.usersUnlimited',
      'limits.historyUnlimited',
      'supportLevel.dedicated',
    ]);
  });
});
