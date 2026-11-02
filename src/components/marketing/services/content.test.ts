import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { SERVICE_KEYS } from '@/config/services';
import { routing, type Locale } from '@/i18n/routing';
import { getPlans, listServices } from '@/lib/services/catalog';
import arPlans from '../../../../messages/ar/plans.json';
import arServices from '../../../../messages/ar/services.json';
import enPlans from '../../../../messages/en/plans.json';
import enServices from '../../../../messages/en/services.json';
import { serviceMessageKeys } from './content';
import { getPlanFeatures } from './pricing';

/**
 * Typed catalogues: message keys used below (including every PlanFeature key)
 * are checked at compile time, and Arabic must have every English key.
 */
const MESSAGES: Record<Locale, { services: typeof enServices; plans: typeof enPlans }> = {
  en: { services: enServices, plans: enPlans },
  ar: { services: arServices, plans: arPlans },
};

function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
}

/** Throw on missing messages or broken ICU syntax instead of logging a fallback. */
function rethrow(error: Error): never {
  throw error;
}

describe.each([...routing.locales])('service page copy (%s)', (locale) => {
  const messages = MESSAGES[locale];
  const services = createTranslator({ locale, messages, namespace: 'services', onError: rethrow });
  const plans = createTranslator({ locale, messages, namespace: 'plans', onError: rethrow });

  it('gives every catalog service exactly the template structure', () => {
    const expected = serviceMessageKeys().sort();
    for (const key of SERVICE_KEYS) {
      expect(keyPaths(messages.services[key]).sort(), `services.${key}`).toEqual(expected);
    }
  });

  it('keeps the ICU placeholders the template passes values to', () => {
    expect(services('page.problems.solutionLabel', { name: 'X1' })).toContain('X1');
    expect(services('page.earlyAccess.title', { name: 'X1' })).toContain('X1');
    expect(services('page.earlyAccess.description', { name: 'X1' })).toContain('X1');
    expect(services('page.faq.title', { name: 'X1' })).toContain('X1');
    expect(plans('titleFor', { name: 'X1' })).toContain('X1');
    expect(plans('saveUpTo', { percent: 20 })).toContain('20');
    expect(plans('billedAnnually', { total: '2,868' })).toContain('2,868');
    expect(plans('annualSavings', { amount: '720' })).toContain('720');
  });

  it('formats every plan feature line of every live service', () => {
    for (const service of listServices()) {
      for (const plan of getPlans(service)) {
        for (const feature of getPlanFeatures(plan)) {
          expect(plans(feature.key, feature.values).trim(), `${service.key}/${plan.tier}: ${feature.key}`).not.toBe('');
        }
      }
    }
  });

  it('pluralises limits for any count, with Latin digits', () => {
    for (const count of [3, 10, 11, 30, 100, 250]) {
      expect(plans('limits.branches', { count })).toContain(String(count));
      expect(plans('limits.users', { count })).toContain(String(count));
    }
    for (const count of [1, 2]) {
      expect(plans('limits.branches', { count }).trim()).not.toBe('');
      expect(plans('limits.users', { count }).trim()).not.toBe('');
    }
    for (const days of [1, 2, 7, 30, 90, 180, 365, 730]) {
      expect(plans('limits.history', { days }).trim()).not.toBe('');
    }
  });
});
