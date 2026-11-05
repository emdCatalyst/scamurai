import { clerkMiddleware, createRouteMatcher, type ClerkMiddlewareAuth } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { defaultLocaleRedirect, localizedPath, splitLocale } from './i18n/paths';
import { NextResponse, type NextRequest } from 'next/server';
import {
  buildContentSecurityPolicy,
  clerkFrontendApiOrigin,
  createNonce,
  cspHeaderName,
  cspMode,
} from './lib/security/csp';
import { isCrossSiteApiWrite } from './lib/security/csrf';
import { getSiteUrl } from './lib/seo/site';

const intlMiddleware = createMiddleware(routing);

/**
 * Public pages, as locale-free paths. English is served at the root and
 * Arabic under /ar, so each is matched in both forms (and under /en, which
 * is redirected before this list is consulted).
 */
const PUBLIC_PAGES = [
  '/',
  '/apply(.*)',
  '/services(.*)',
  '/inactive(.*)',
  '/:adminSlug/login(.*)',
  '/brands/:brandSlug/login(.*)',
  '/brands/:brandSlug/suspended(.*)',
  '/brands/:brandSlug/inactive(.*)',
  // A brand's staff-app manifest: its name and colours, nothing private.
  '/brands/:brandSlug/manifest.webmanifest',
];

export const isPublicRoute = createRouteMatcher([
  ...PUBLIC_PAGES,
  ...routing.locales.flatMap((locale) => PUBLIC_PAGES.map((page) => `/${locale}${page === '/' ? '' : page}`)),
  '/api/webhooks(.*)',
  // Development storage: every request carries its own signed, expiring token.
  '/api/storage/local(.*)',
  // Browsers post Content-Security-Policy violations here.
  '/api/csp-report',
  // Uptime monitoring.
  '/api/health',
]);

/**
 * Stricter headers for the master-admin console. They override the baseline
 * from next.config.ts, and are set here at runtime because next.config.ts
 * `headers()` runs at build time, where the secret admin slug doesn't belong.
 */
const ADMIN_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

const LOCALES: readonly string[] = routing.locales;

/** The first path segment after the optional locale prefix: '/brands/x' and '/ar/brands/x' → 'brands'. */
export function sectionOf(pathname: string): string | undefined {
  const [first, second] = pathname.split('/').filter(Boolean);
  return first !== undefined && LOCALES.includes(first) ? second : first;
}

/** English `/<ADMIN_SLUG>/…`, Arabic `/ar/<ADMIN_SLUG>/…`, or `/en/<ADMIN_SLUG>/…` on its way to the first. */
export function isAdminPath(pathname: string): boolean {
  const adminSlug = process.env.ADMIN_SLUG;
  return Boolean(adminSlug) && sectionOf(pathname) === adminSlug;
}

/** Signed-in areas. They are rendered per request, so their scripts can carry a CSP nonce. */
export function isPortalPath(pathname: string): boolean {
  const section = sectionOf(pathname);
  return section === 'brands' || section === 'onboarding' || isAdminPath(pathname);
}

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const CLERK_ORIGIN = clerkFrontendApiOrigin(CLERK_PUBLISHABLE_KEY);
const IS_DEV = process.env.NODE_ENV === 'development';

/** This page's Content-Security-Policy, or null for API routes and CSP_MODE=off. */
function pagePolicy(pathname: string): { header: string; value: string; nonce?: string } | null {
  const mode = cspMode();
  if (mode === 'off' || pathname.startsWith('/api')) return null;

  const nonce = isPortalPath(pathname) ? createNonce() : undefined;
  const value = buildContentSecurityPolicy({
    nonce,
    frameAncestors: isAdminPath(pathname) ? "'none'" : "'self'",
    reportOnly: mode === 'report-only',
    isDev: IS_DEV,
    upgradeInsecureRequests: !IS_DEV && getSiteUrl().protocol === 'https:',
    clerkOrigin: CLERK_ORIGIN,
    clerkTelemetry: CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') ?? false,
  });
  return { header: cspHeaderName(mode), value, nonce };
}

/** Request headers that carry the nonce to Next.js and Clerk; never taken from the client. */
const NONCE_REQUEST_HEADERS = ['content-security-policy', 'content-security-policy-report-only', 'x-nonce'];

async function route(auth: ClerkMiddlewareAuth, req: NextRequest): Promise<NextResponse> {
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  
  const { locale, path: localeFreePath } = splitLocale(req.nextUrl.pathname);

  // 1. Check if it's a public route
  const isPublic = isPublicRoute(req);

  // 2. Authorization logic for non-public routes
  if (!isPublic) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const pathname = req.nextUrl.pathname;

      // A. Check if it's a brand route: /brands/:brandSlug/...
      const brandMatch = pathname.match(/\/brands\/([^/]+)/);
      if (brandMatch) {
        const brandSlug = brandMatch[1];
        return NextResponse.redirect(new URL(localizedPath(locale, `/brands/${brandSlug}/login`), req.url));
      }

      // B. Any other page (the admin console, onboarding, …) checks access itself
      const segments = localeFreePath.split('/').filter(Boolean);
      if (segments.length >= 1 && !pathname.includes('/brands/')) {
        return intlMiddleware(req);
      }

      return NextResponse.redirect(new URL(localizedPath(locale, '/'), req.url));
    }

    // Status Checks (Skip for master_admin)
    const role = sessionClaims?.metadata?.role as string | undefined;
    
    if (role !== 'master_admin') {
      const userIsActive = sessionClaims?.metadata?.userIsActive !== false;
      const brandIsActive = sessionClaims?.metadata?.brandIsActive !== false;

      if (!userIsActive) {
        const pathname = req.nextUrl.pathname;
        const brandMatch = pathname.match(/\/brands\/([^/]+)/);
        
        if (brandMatch) {
          const brandSlug = brandMatch[1];
          return isApiRoute
            ? NextResponse.json({ error: 'Account inactive' }, { status: 403 })
            : NextResponse.redirect(new URL(localizedPath(locale, `/brands/${brandSlug}/inactive`), req.url));
        }

        return isApiRoute 
          ? NextResponse.json({ error: 'Account inactive' }, { status: 403 })
          : NextResponse.redirect(new URL(localizedPath(locale, '/inactive'), req.url));
      }

      if (!brandIsActive) {
        const pathname = req.nextUrl.pathname;
        const brandMatch = pathname.match(/\/brands\/([^/]+)/);
        
        if (brandMatch) {
          const brandSlug = brandMatch[1];
          return isApiRoute
            ? NextResponse.json({ error: 'Brand suspended' }, { status: 403 })
            : NextResponse.redirect(new URL(localizedPath(locale, `/brands/${brandSlug}/suspended`), req.url));
        }

        return isApiRoute
          ? NextResponse.json({ error: 'Brand suspended' }, { status: 403 })
          : NextResponse.redirect(new URL(localizedPath(locale, '/inactive'), req.url));
      }
    }
  }

  // 3. Always apply intlMiddleware at the end to ensure it handles localized routing
  return isApiRoute ? NextResponse.next() : intlMiddleware(req);
}

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isCrossSiteApiWrite(req.method, req.nextUrl.pathname, req.headers)) {
    return NextResponse.json({ error: 'Cross-site request refused' }, { status: 403 });
  }

  const csp = pagePolicy(req.nextUrl.pathname);

  // Next.js reads the nonce from the request's CSP header and puts it on its
  // own scripts, and Clerk from x-nonce. next-intl passes request headers on.
  for (const name of NONCE_REQUEST_HEADERS) req.headers.delete(name);
  if (csp?.nonce) {
    req.headers.set(csp.header, csp.value);
    req.headers.set('x-nonce', csp.nonce);
  }

  // /en/… → /… before anything else, so English has exactly one URL per page.
  const enRedirect = defaultLocaleRedirect(req.nextUrl);
  const response = enRedirect ? NextResponse.redirect(enRedirect, 308) : await route(auth, req);

  if (csp) response.headers.set(csp.header, csp.value);
  if (isAdminPath(req.nextUrl.pathname)) {
    for (const [name, value] of Object.entries(ADMIN_HEADERS)) response.headers.set(name, value);
  }
  return response;
});

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params.
    // robots.txt, sitemap.xml and the site manifest live at the root for
    // every locale, so they skip auth + locale handling. A brand's staff-app
    // manifest (/brands/<slug>/manifest.webmanifest, /ar/… in Arabic) does run
    // through it, so next-intl can map the English URL to its route.
    '/((?!_next|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|otf|OTF|ico|csv|docx?|xlsx?|zip)).*)',
    // Always run for API routes and clerk internals
    '/(api|trpc|__clerk)(.*)',
  ],
};
