import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, type NextFetchEvent } from 'next/server';

/**
 * The proxy with Clerk's session stubbed: clerkMiddleware hands the handler
 * an `auth()` that answers with `session`, everything else (route matching,
 * next-intl, CSP) is the real code.
 */
const session = vi.hoisted(() => ({ userId: null as string | null, role: 'brand_admin' }));
vi.mock('@clerk/nextjs/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clerk/nextjs/server')>();
  return {
    ...actual,
    clerkMiddleware:
      (handler: (auth: () => Promise<unknown>, req: NextRequest) => Promise<Response>) => (req: NextRequest) =>
        handler(
          async () => ({ userId: session.userId, sessionClaims: { metadata: { role: session.role } } }),
          req
        ),
  };
});

const ADMIN_SLUG = 'secret-admin-path';
const ORIGIN = 'https://misdaq.sa.com';

beforeEach(() => {
  vi.stubEnv('ADMIN_SLUG', ADMIN_SLUG);
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', ORIGIN);
  session.userId = null;
});
afterEach(() => vi.unstubAllEnvs());

const { proxy, isPublicRoute, isAdminPath, isPortalPath, sectionOf } = await import('./proxy');

async function get(path: string, init?: ConstructorParameters<typeof NextRequest>[1]): Promise<Response> {
  const handler = proxy as unknown as (req: NextRequest, event: NextFetchEvent) => Promise<Response>;
  return handler(new NextRequest(new URL(path, ORIGIN), init), {} as NextFetchEvent);
}

describe('/en is never served', () => {
  it.each([
    ['/en', '/'],
    ['/en/', '/'],
    ['/en/apply', '/apply'],
    ['/en/apply?service=order-protection&plan=pro', '/apply?service=order-protection&plan=pro'],
    ['/en/services/order-protection', '/services/order-protection'],
    ['/en/brands/demo/login', '/brands/demo/login'],
  ])('%s → 308 %s', async (from, to) => {
    const response = await get(from);
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(`${ORIGIN}${to}`);
  });

  it('keeps the admin headers on the redirect of an admin path', async () => {
    const response = await get(`/en/${ADMIN_SLUG}/login`);
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(`${ORIGIN}/${ADMIN_SLUG}/login`);
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });
});

describe('English at the root, Arabic under /ar', () => {
  it('serves / as English whatever the browser or an old cookie asks for', async () => {
    const response = await get('/', { headers: { 'accept-language': 'ar-SA,ar;q=0.9', cookie: 'NEXT_LOCALE=ar' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    // next-intl rewrites / to the English route internally.
    expect(response.headers.get('x-middleware-rewrite')).toBe(`${ORIGIN}/en`);
    expect(response.headers.get('set-cookie') ?? '').not.toContain('NEXT_LOCALE');
  });

  it('serves /ar and /ar/apply as Arabic without a redirect', async () => {
    for (const path of ['/ar', '/ar/apply']) {
      const response = await get(path, { headers: { 'accept-language': 'en-US' } });
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('maps an unprefixed English page to the English route', async () => {
    const response = await get('/services/order-protection');
    expect(response.headers.get('x-middleware-rewrite')).toBe(`${ORIGIN}/en/services/order-protection`);
  });
});

describe('signed-out redirects keep the language', () => {
  it('sends a brand page to the brand sign-in in the same language', async () => {
    const english = await get('/brands/demo/dashboard');
    expect(english.status).toBe(307);
    expect(english.headers.get('location')).toBe(`${ORIGIN}/brands/demo/login`);

    const arabic = await get('/ar/brands/demo/dashboard');
    expect(arabic.headers.get('location')).toBe(`${ORIGIN}/ar/brands/demo/login`);
  });

  it('refuses the API with 401 instead of a redirect', async () => {
    const response = await get('/api/orders/upload-urls');
    expect(response.status).toBe(401);
  });
});

describe('route classification', () => {
  const req = (path: string) => new NextRequest(new URL(path, ORIGIN));

  it('matches public pages in both URL forms', () => {
    for (const path of [
      '/',
      '/ar',
      '/apply',
      '/ar/apply',
      '/services/order-protection',
      '/ar/services/order-protection',
      '/brands/demo/login',
      '/ar/brands/demo/login',
      '/brands/demo/suspended',
      '/ar/brands/demo/inactive',
      '/brands/demo/manifest.webmanifest',
      '/ar/brands/demo/manifest.webmanifest',
      `/${ADMIN_SLUG}/login`,
      `/ar/${ADMIN_SLUG}/login`,
    ]) {
      expect(isPublicRoute(req(path)), path).toBe(true);
    }
  });

  it('keeps signed-in areas private in both URL forms', () => {
    for (const path of [
      '/brands/demo/dashboard',
      '/ar/brands/demo/submit',
      '/onboarding/brand-setup',
      '/ar/onboarding/brand-setup',
      `/${ADMIN_SLUG}/dashboard`,
      `/ar/${ADMIN_SLUG}/dashboard`,
      '/api/orders/upload-urls',
    ]) {
      expect(isPublicRoute(req(path)), path).toBe(false);
    }
  });

  it('finds the section, admin console and portals with or without the prefix', () => {
    expect(sectionOf('/brands/demo')).toBe('brands');
    expect(sectionOf('/ar/brands/demo')).toBe('brands');
    expect(isAdminPath(`/${ADMIN_SLUG}/dashboard`)).toBe(true);
    expect(isAdminPath(`/ar/${ADMIN_SLUG}/dashboard`)).toBe(true);
    expect(isAdminPath('/apply')).toBe(false);
    for (const path of ['/brands/demo/submit', '/ar/brands/demo/submit', '/onboarding/brand-setup', `/${ADMIN_SLUG}`]) {
      expect(isPortalPath(path), path).toBe(true);
    }
    expect(isPortalPath('/services/order-protection')).toBe(false);
  });
});
