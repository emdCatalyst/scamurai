import { defineRouting } from 'next-intl/routing';

/**
 * URL scheme: English at the root (/, /apply, /services/…), Arabic under /ar.
 * /en/… is never served; src/proxy.ts sends it to the same path without /en
 * (308) before next-intl runs, so every page has one URL per language.
 */
export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // The URL alone decides the language: / is always English, whatever the
  // browser's Accept-Language says.
  localeDetection: false,
  // With no detection there is nothing to remember, so next-intl sets no
  // NEXT_LOCALE cookie (an old one is ignored: detection is off).
  localeCookie: false,
  // hreflang comes from page metadata and sitemap.xml (absolute, with an
  // x-default that doesn't redirect). The middleware's Link header would add a
  // second, conflicting set, so it is turned off.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
