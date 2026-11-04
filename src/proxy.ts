import { clerkMiddleware, createRouteMatcher, type ClerkMiddlewareAuth } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';
import {
  buildContentSecurityPolicy,
  clerkFrontendApiOrigin,
  createNonce,
  cspHeaderName,
  cspMode,
} from './lib/security/csp';
import { getSiteUrl } from './lib/seo/site';

const intlMiddleware = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  '/:locale',
  '/:locale/apply(.*)',
  '/:locale/services(.*)',
  '/:locale/inactive(.*)',
  '/:locale/:adminSlug/login(.*)',
  '/:locale/brands/:brandSlug/login(.*)',
  '/:locale/brands/:brandSlug/suspended(.*)',
  '/:locale/brands/:brandSlug/inactive(.*)',
  '/api/webhooks(.*)',
  // Development storage: every request carries its own signed, expiring token.
  '/api/storage/local(.*)',
  // Browsers post Content-Security-Policy violations here.
  '/api/csp-report',
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

/** The first path segment after the optional locale prefix. */
function sectionOf(pathname: string): string | undefined {
  const [first, second] = pathname.split('/').filter(Boolean);
  return first !== undefined && LOCALES.includes(first) ? second : first;
}

/** `/<locale>/<ADMIN_SLUG>/…`, or the unprefixed `/<ADMIN_SLUG>/…` that next-intl redirects. */
function isAdminPath(pathname: string): boolean {
  const adminSlug = process.env.ADMIN_SLUG;
  return Boolean(adminSlug) && sectionOf(pathname) === adminSlug;
}

/** Signed-in areas. They are rendered per request, so their scripts can carry a CSP nonce. */
function isPortalPath(pathname: string): boolean {
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
  
  const firstSegment = req.nextUrl.pathname.split('/')[1];
  const locale = ['en', 'ar'].includes(firstSegment || '') ? firstSegment : 'en';

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
        return NextResponse.redirect(new URL(`/${locale}/brands/${brandSlug}/login`, req.url));
      }

      // B. Check if it's an admin route
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && !pathname.includes('/brands/')) {
        return intlMiddleware(req);
      }

      return NextResponse.redirect(new URL(`/${locale}`, req.url));
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
            : NextResponse.redirect(new URL(`/${locale}/brands/${brandSlug}/inactive`, req.url));
        }

        return isApiRoute 
          ? NextResponse.json({ error: 'Account inactive' }, { status: 403 })
          : NextResponse.redirect(new URL(`/${locale}/inactive`, req.url));
      }

      if (!brandIsActive) {
        const pathname = req.nextUrl.pathname;
        const brandMatch = pathname.match(/\/brands\/([^/]+)/);
        
        if (brandMatch) {
          const brandSlug = brandMatch[1];
          return isApiRoute
            ? NextResponse.json({ error: 'Brand suspended' }, { status: 403 })
            : NextResponse.redirect(new URL(`/${locale}/brands/${brandSlug}/suspended`, req.url));
        }

        return isApiRoute
          ? NextResponse.json({ error: 'Brand suspended' }, { status: 403 })
          : NextResponse.redirect(new URL(`/${locale}/inactive`, req.url));
      }
    }
  }

  // 3. Always apply intlMiddleware at the end to ensure it handles localized routing
  return isApiRoute ? NextResponse.next() : intlMiddleware(req);
}

export const proxy = clerkMiddleware(async (auth, req) => {
  const csp = pagePolicy(req.nextUrl.pathname);

  // Next.js reads the nonce from the request's CSP header and puts it on its
  // own scripts, and Clerk from x-nonce. next-intl passes request headers on.
  for (const name of NONCE_REQUEST_HEADERS) req.headers.delete(name);
  if (csp?.nonce) {
    req.headers.set(csp.header, csp.value);
    req.headers.set('x-nonce', csp.nonce);
  }

  const response = await route(auth, req);

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
    // robots.txt and sitemap.xml are requested by crawlers without a locale
    // prefix, so they must skip auth + locale redirects too (the manifest is
    // already covered by the .webmanifest extension).
    '/((?!_next|robots\\.txt$|sitemap\\.xml$|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|otf|OTF|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes and clerk internals
    '/(api|trpc|__clerk)(.*)',
  ],
};
