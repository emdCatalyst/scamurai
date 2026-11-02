import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routing } from '@/i18n/routing';
import { listServices } from '@/lib/services/catalog';
import robots from './robots';
import sitemap from './sitemap';

const SITE = 'https://scamurai.example';
const ADMIN_SLUG = 'secret-admin-path';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE);
  vi.stubEnv('ADMIN_SLUG', ADMIN_SLUG);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sitemap', () => {
  it('lists home, every catalog service and the apply page once per locale', () => {
    const urls = sitemap().map((entry) => entry.url);
    const paths = ['', ...listServices().map((service) => `/services/${service.slug}`), '/apply'];

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toHaveLength(paths.length * routing.locales.length);
    for (const locale of routing.locales) {
      for (const path of paths) expect(urls).toContain(`${SITE}/${locale}${path}`);
    }
  });

  it('gives every entry absolute hreflang alternates for each locale plus x-default', () => {
    for (const entry of sitemap()) {
      const languages = entry.alternates?.languages ?? {};

      expect(Object.keys(languages).sort()).toEqual([...routing.locales, 'x-default'].sort());
      expect(Object.values(languages)).toContain(entry.url);
      expect(languages['x-default']).toBe(languages[routing.defaultLocale]);
      for (const url of Object.values(languages)) expect(url?.startsWith(`${SITE}/`)).toBe(true);
    }
  });

  it('never lists signed-in, transactional or API routes', () => {
    const serialized = JSON.stringify(sitemap());
    for (const fragment of ['/brands', '/onboarding', '/api', '/apply/success', ADMIN_SLUG]) {
      expect(serialized).not.toContain(fragment);
    }
  });
});

describe('robots', () => {
  it('allows the site, blocks API and signed-in areas in every locale, and links the sitemap', () => {
    const { rules, sitemap: sitemapUrl } = robots();
    const rule = Array.isArray(rules) ? rules[0] : rules;

    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toContain('/api/');
    for (const locale of routing.locales) {
      expect(rule.disallow).toContain(`/${locale}/brands/`);
      expect(rule.disallow).toContain(`/${locale}/onboarding/`);
    }
    expect(sitemapUrl).toBe(`${SITE}/sitemap.xml`);
  });

  it('never reveals the secret admin path', () => {
    expect(JSON.stringify(robots())).not.toContain(ADMIN_SLUG);
  });
});
