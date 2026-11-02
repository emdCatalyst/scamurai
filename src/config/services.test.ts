import { describe, expect, it } from 'vitest';
import { PLAN_TIERS, SERVICE_KEYS, SERVICE_ORDER, SERVICES } from './services';
import { PLANS } from './plans';
import {
  getMaxAnnualDiscountPercent,
  getPlan,
  getServiceBySlug,
  getStartingPrice,
  isLiveService,
  listServices,
} from '@/lib/services/catalog';

describe('service catalog', () => {
  it('lists every service exactly once, in display order', () => {
    expect([...SERVICE_ORDER].sort()).toEqual([...SERVICE_KEYS].sort());
    expect(listServices().map((s) => s.key)).toEqual([...SERVICE_ORDER]);
  });

  it('keys each entry by its own key', () => {
    for (const key of SERVICE_KEYS) expect(SERVICES[key].key).toBe(key);
  });

  it('uses unique, URL-safe slugs', () => {
    const slugs = listServices().map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const service of listServices()) expect(getServiceBySlug(service.slug)).toBe(service);
    expect(getServiceBySlug('does-not-exist')).toBeUndefined();
  });

  it('gives live services at least one plan with unique, known tiers and sane prices', () => {
    for (const service of listServices().filter(isLiveService)) {
      const tiers = service.plans.map((p) => p.tier);
      expect(tiers.length).toBeGreaterThan(0);
      expect(new Set(tiers).size).toBe(tiers.length);
      for (const plan of service.plans) {
        expect(PLAN_TIERS).toContain(plan.tier);
        if (plan.pricing) {
          expect(plan.pricing.monthly).toBeGreaterThan(0);
          expect(plan.pricing.annualMonthly).toBeGreaterThan(0);
          expect(plan.pricing.annualMonthly).toBeLessThanOrEqual(plan.pricing.monthly);
        }
      }
    }
  });

  it('derives price hints from the plans', () => {
    expect(getStartingPrice(SERVICES.dispute_orders)).toBe(299);
    expect(getMaxAnnualDiscountPercent(SERVICES.dispute_orders)).toBe(20);
    expect(getStartingPrice(SERVICES.compliance)).toBeNull();
    expect(getPlan(SERVICES.compliance, 'starter')).toBeUndefined();
  });

  it('keeps legacy PLANS limits unchanged for the existing brand portal', () => {
    expect(PLANS).toEqual({
      starter: { max_branches: 3, max_users: 10, label: 'Starter' },
      growth: { max_branches: 10, max_users: 30, label: 'Growth' },
      enterprise: { max_branches: 999, max_users: 50, label: 'Enterprise' },
    });
  });
});
