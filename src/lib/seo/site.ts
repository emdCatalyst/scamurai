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

/** The brand name in each language: og:site_name, title suffix, JSON-LD. */
export const SITE_NAME: Record<Locale, string> = { en: 'Misdaq', ar: 'مصداق' };

/** "Page — Misdaq" in English, "الصفحة — مصداق" in Arabic. */
export function fullTitle(locale: Locale, title: string): string {
  return `${title} — ${SITE_NAME[locale]}`;
}

/**
 * Canonical + hreflang alternates for a page that exists in every locale, all
 * absolute: English at the root, Arabic under /ar, x-default on the English
 * URL (which never redirects).
 */
export function buildAlternates(locale: Locale, path: string): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, absoluteUrl(localizedPath(l, path))])
  );
  languages['x-default'] = absoluteUrl(localizedPath(routing.defaultLocale, path));
  return { canonical: absoluteUrl(localizedPath(locale, path)), languages };
}

export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', ar: 'ar_SA' };

export function otherLocales(locale: Locale): Locale[] {
  return routing.locales.filter((l) => l !== locale);
}

/**
 * The share card of each language (scripts/generate-og-image.mjs): the
 * English one shows MISDAQ, the Arabic one مصداق.
 */
export function shareImage(locale: Locale) {
  return {
    url: absoluteUrl(`/og/misdaq-${locale}.png`),
    width: 1200,
    height: 630,
    alt: SITE_NAME[locale],
    type: 'image/png',
  };
}

/** Open Graph fields every page in `locale` carries. */
export function baseOpenGraph(locale: Locale) {
  return {
    type: 'website' as const,
    siteName: SITE_NAME[locale],
    locale: OG_LOCALE[locale],
    alternateLocale: otherLocales(locale).map((other) => OG_LOCALE[other]),
    images: [shareImage(locale)],
  };
}

/**
 * Everything a public page needs in its metadata: its own title and
 * description, a self-referencing absolute canonical, hreflang for every
 * locale plus x-default, and Open Graph / X cards whose URL is the canonical.
 *
 * `title` is the page's own name ("Get started"); the brand is appended
 * ("Get started — Misdaq"). Pass `brandedTitle` for a title that already
 * names the brand, like the home page's.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  brandedTitle = false,
}: {
  locale: Locale;
  /** Locale-free path, e.g. '/' or '/services/order-protection'. */
  path: string;
  title: string;
  description: string;
  brandedTitle?: boolean;
}): Metadata {
  const fullPageTitle = brandedTitle ? title : fullTitle(locale, title);
  const alternates = buildAlternates(locale, path);
  const image = shareImage(locale);

  return {
    title: { absolute: fullPageTitle },
    description,
    alternates,
    openGraph: {
      ...baseOpenGraph(locale),
      url: alternates.canonical as string,
      title: fullPageTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullPageTitle,
      description,
      images: [image],
    },
  };
}

/** Pages that must never be indexed (portals, auth, transactional pages, 404s). */
export const NO_INDEX: NonNullable<Metadata['robots']> = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};
