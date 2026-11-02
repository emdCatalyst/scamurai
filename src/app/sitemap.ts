import type { MetadataRoute } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import { absoluteUrl, localizedPath } from '@/lib/seo/site';
import { listServices } from '@/lib/services/catalog';
import { getServicePath } from '@/components/marketing/services/links';

/**
 * Every indexable marketing page, as a locale-free path. Service pages come
 * from the catalog, so a new service is listed automatically. The admin
 * console, brand portals, onboarding, API routes and transactional pages
 * (e.g. /apply/success) are noindex and must never appear here.
 */
function indexablePaths(): string[] {
  return ['/', ...listServices().map(getServicePath), '/apply'];
}

/** Absolute hreflang alternates for one path, keyed by locale plus x-default. */
function languageAlternates(path: string): Record<string, string> {
  const urlFor = (locale: Locale) => absoluteUrl(localizedPath(locale, path));
  return Object.fromEntries([
    ...routing.locales.map((locale) => [locale, urlFor(locale)] as const),
    ['x-default', urlFor(routing.defaultLocale)] as const,
  ]);
}

/**
 * Served at /sitemap.xml. Generated at build time, so `lastModified` is the
 * deploy date: marketing copy and the catalog only change with a deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return indexablePaths().flatMap((path) => {
    const languages = languageAlternates(path);
    return routing.locales.map((locale) => ({
      url: languages[locale],
      lastModified,
      alternates: { languages },
    }));
  });
}
