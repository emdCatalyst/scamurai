import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { absoluteUrl, localizedPath } from '@/lib/seo/site';

/**
 * Signed-in areas crawlers should skip, in every language: /brands/ and
 * /onboarding/ for English, /ar/brands/ and /ar/onboarding/ for Arabic. The
 * admin console is deliberately not listed: its path (ADMIN_SLUG) is a
 * secret, robots.txt is public, and admin pages already send `noindex`.
 * /media/ stays crawlable: it only serves public brand logos.
 */
const PRIVATE_SECTIONS = ['/brands/', '/onboarding/'];

/** Served at /robots.txt. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        ...routing.locales.flatMap((locale) => PRIVATE_SECTIONS.map((section) => localizedPath(locale, section))),
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
