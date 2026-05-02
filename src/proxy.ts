import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  '/:locale',
  '/:locale/apply(.*)',
  '/:locale/inactive(.*)',
  '/:locale/:adminSlug/login(.*)',
  '/:locale/brands/:brandSlug/login(.*)',
  '/:locale/brands/:brandSlug/suspended(.*)',
  '/:locale/brands/:brandSlug/inactive(.*)',
  '/api/webhooks(.*)',
]);

export const proxy = clerkMiddleware(async (auth, req) => {
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
});

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|otf|OTF|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes and clerk internals
    '/(api|trpc|__clerk)(.*)',
  ],
};
