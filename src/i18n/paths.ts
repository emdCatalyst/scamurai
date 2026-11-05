import { routing, type Locale } from './routing';

/**
 * The public path of a page in one locale: English at the root, every other
 * locale under its prefix. ('en', '/apply') → '/apply', ('ar', '/apply') →
 * '/ar/apply', ('en', '/') → '/', ('ar', '/') → '/ar'. A query string or hash
 * in `path` is kept.
 *
 * Use it for every URL built by hand (redirects, emails, sign-out targets,
 * manifests); next-intl's Link, redirect and router apply the same rule.
 */
export function localizedPath(locale: Locale, path: string): string {
  const normalized = path === '' || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  if (locale === routing.defaultLocale) return normalized === '' ? '/' : normalized;
  return `/${locale}${normalized}`;
}

/** Locales that are served under a /<locale> prefix (all but the default). */
export const PREFIXED_LOCALES: readonly Locale[] = routing.locales.filter(
  (locale) => locale !== routing.defaultLocale
);

/**
 * Splits a request path into its locale and the locale-free rest:
 * '/ar/apply' → { locale: 'ar', path: '/apply', prefixed: true },
 * '/apply' → { locale: 'en', path: '/apply', prefixed: false }. A leading
 * /en is reported as prefixed so the proxy can redirect it away.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string; prefixed: boolean } {
  const [, first = '', ...rest] = pathname.split('/');
  const match = routing.locales.find((locale) => locale === first);
  if (!match) return { locale: routing.defaultLocale, path: pathname || '/', prefixed: false };
  return { locale: match, path: `/${rest.join('/')}`, prefixed: true };
}

/**
 * Where a request for /en or /en/… belongs: the same path without /en, with
 * the query string kept. Null for every other path. English is served at the
 * root, so the prefixed form would be duplicate content.
 */
export function defaultLocaleRedirect(url: URL): URL | null {
  const prefix = `/${routing.defaultLocale}`;
  if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return null;
  const target = new URL(url.toString());
  target.pathname = url.pathname.slice(prefix.length) || '/';
  return target;
}
