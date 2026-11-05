import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import { localizedPath } from '@/i18n/paths';

/** The production domain: the last fallback for every absolute URL the app builds. */
export const DEFAULT_SITE_URL = 'https://misdaq.sa.com';

/**
 * Canonical site origin, for canonical URLs, hreflang, Open Graph and the
 * sitemap. NEXT_PUBLIC_SITE_URL is https://misdaq.sa.com on Vercel; APP_URL
 * is the fallback the app already uses, then the production domain.
 */
export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || DEFAULT_SITE_URL;
  return new URL(raw.endsWith('/') ? raw : `${raw}/`);
}

/**
 * Origin for links in emails and invitations, without a trailing slash.
 * APP_URL comes first: a staging app must link to itself, not to the site.
 */
export function getAppUrl(): string {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  return new URL(path.replace(/^\//, ''), getSiteUrl()).toString();
}

export { localizedPath };

/** Canonical + hreflang alternates for a page that exists in every locale. */
export function buildAlternates(locale: Locale, path: string): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, localizedPath(l, path)])
  );
  languages['x-default'] = localizedPath(routing.defaultLocale, path);
  return { canonical: localizedPath(locale, path), languages };
}

export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', ar: 'ar_SA' };

export function otherLocales(locale: Locale): Locale[] {
  return routing.locales.filter((l) => l !== locale);
}

/**
 * Open Graph fields every page should carry. A page-level `openGraph` replaces
 * the inherited one entirely, so pages spread this in and add their own url,
 * title, description and (from a child segment) the inherited images.
 */
export function baseOpenGraph(locale: Locale, siteName: string) {
  return {
    type: 'website' as const,
    siteName,
    locale: OG_LOCALE[locale],
    alternateLocale: otherLocales(locale).map((other) => OG_LOCALE[other]),
  };
}

/** Pages that must never be indexed (portals, auth, transactional pages). */
export const NO_INDEX: NonNullable<Metadata['robots']> = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};
