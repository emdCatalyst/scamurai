import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';

/**
 * Canonical site origin. Set NEXT_PUBLIC_SITE_URL to the production domain
 * (e.g. https://scamurai.com); APP_URL is the fallback the app already uses.
 */
export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000';
  return new URL(raw.endsWith('/') ? raw : `${raw}/`);
}

export function absoluteUrl(path: string): string {
  return new URL(path.replace(/^\//, ''), getSiteUrl()).toString();
}

/** `/` + locale + path, e.g. ('ar', '/services/x') → '/ar/services/x', ('en', '/') → '/en'. */
export function localizedPath(locale: Locale, path: string): string {
  const normalized = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${normalized}`;
}

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

/** Pages that must never be indexed (portals, auth, transactional pages). */
export const NO_INDEX: NonNullable<Metadata['robots']> = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};
