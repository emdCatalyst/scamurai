import { createElement, type ComponentProps, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import brand from '../../../../../../messages/en/brand.json';

const state = vi.hoisted(() => ({
  session: { userId: 'user_a', role: 'staff', brandId: 'brand-1' } as { userId: string; role: string; brandId: string | null },
  user: { id: 'u1', fullName: 'Sara Al-Qahtani', branchId: 'branch-1', branch: { name: 'Olaya' } } as Record<string, unknown> | undefined,
}));

vi.mock('@/lib/auth', () => ({ ORDER_SUBMITTER_ROLES: ['staff'], requireAuth: async () => state.session }));
vi.mock('@/lib/queries/brands', () => ({
  getBrandBySlug: async (slug: string) => (slug === 'demo' ? { id: 'brand-1', slug: 'demo', name: 'Demo Burger', logoUrl: null } : undefined),
}));
vi.mock('@/lib/queries/orders', () => ({
  getEnabledDeliveryAppOptions: async () => [{ id: 'app-1', name: 'Jahez', logoUrl: '/media/jahez.png' }],
}));
vi.mock('@/lib/db', () => ({ db: { query: { users: { findFirst: async () => state.user } } } }));
vi.mock('next-intl/server', async () => {
  const messages = (await import('../../../../../../messages/en/brand.json')).default;
  return {
    setRequestLocale: () => {},
    getTranslations: async (namespace: string) => createTranslator({ locale: 'en', messages: { brand: messages }, namespace: namespace as 'brand.submit' }),
  };
});
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  useRouter: () => ({ replace: () => {} }),
}));
// The client parts of the screen, as far as a server render needs them.
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ userId: 'user_a' }), useClerk: () => ({ signOut: async () => {} }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: () => {} }) }));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ replace: () => {} }), usePathname: () => '/brands/demo/submit' }));
vi.mock('next/web-vitals', () => ({ useReportWebVitals: () => {} }));

const { default: StaffSubmitPage } = await import('./page');

const open = (brandSlug = 'demo') => StaffSubmitPage({ params: Promise.resolve({ locale: 'en', brandSlug }) });

async function html(brandSlug = 'demo') {
  const page = (await open(brandSlug)) as ReactElement;
  const intl = { locale: 'en', timeZone: 'Asia/Riyadh', messages: { brand } } as unknown as ComponentProps<typeof NextIntlClientProvider>;
  return renderToString(createElement(NextIntlClientProvider, intl, page));
}

describe('the order screen', () => {
  beforeEach(() => {
    state.session = { userId: 'user_a', role: 'staff', brandId: 'brand-1' };
    state.user = { id: 'u1', fullName: 'Sara Al-Qahtani', branchId: 'branch-1', branch: { name: 'Olaya' } };
  });

  it('sends the brand’s admins and finance to their own screens: the order APIs refuse them', async () => {
    state.session = { userId: 'user_b', role: 'brand_admin', brandId: 'brand-1' };
    await expect(open()).rejects.toThrow('REDIRECT /brands/demo/dashboard');
    state.session = { userId: 'user_c', role: 'finance', brandId: 'brand-1' };
    await expect(open()).rejects.toThrow('REDIRECT /brands/demo/orders');
  });

  it('is not found for another brand’s accounts', async () => {
    state.session = { userId: 'user_d', role: 'staff', brandId: 'brand-2' };
    await expect(open()).rejects.toThrow('NOT_FOUND');
    state.session = { userId: 'user_e', role: 'master_admin', brandId: null };
    await expect(open()).rejects.toThrow('NOT_FOUND');
  });

  it('tells a worker without a branch to ask for one', async () => {
    state.user = { ...state.user, branchId: null, branch: null };
    expect(await html()).toContain(brand.submit.noBranchTitle);
  });

  it('shows who is signed in, the brand’s enabled apps, and a named sign-out button', async () => {
    const page = await html();
    expect(page).toContain('Sara Al-Qahtani');
    expect(page).toContain('Signed in as Sara Al-Qahtani');
    expect(page).toContain('Olaya');
    expect(page).toContain('Jahez');
    expect(page).toContain(`aria-label="${brand.submit.signOut}"`);
    // The page's own copy of the tokens is gone: the brand layout sets them all.
    expect(page).not.toContain('--brand-primary:');
  });
});
