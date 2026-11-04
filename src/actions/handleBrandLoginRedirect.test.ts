import { afterEach, describe, expect, it, vi } from 'vitest';

const EMAIL = 'worker@brand.example';

const state = vi.hoisted(() => ({ user: null as Record<string, unknown> | null, saveFails: false }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: 'user_1' }),
  clerkClient: async () => ({ users: { getUser: async () => ({ publicMetadata: {} }) } }),
}));
vi.mock('@/lib/queries/users', () => ({ getUserByClerkId: async () => state.user }));
vi.mock('@/lib/db', () => ({
  db: {
    update: () => ({
      set: () => ({
        where: async () => {
          if (state.saveFails) throw new Error('connection lost');
        },
      }),
    }),
  },
}));

const { handleBrandLoginRedirect } = await import('./handleBrandLoginRedirect');

const staff = (changes: Record<string, unknown> = {}) => ({
  id: 'b7e6c1d2-0000-4000-8000-000000000001',
  email: EMAIL,
  role: 'staff',
  isActive: true,
  joinedAt: null,
  onboardingComplete: true,
  brandId: 'brand-1',
  brand: { slug: 'demo-burger', name: 'Demo Burger', isActive: true },
  ...changes,
});

describe('handleBrandLoginRedirect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    state.saveFails = false;
  });

  it('sends staff to the order screen and never logs their e-mail address', async () => {
    const logged = (['log', 'info', 'warn', 'error'] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => {}));
    const cases: [Record<string, unknown>, string, unknown][] = [
      [staff(), 'demo-burger', { success: true, target: '/brands/demo-burger/submit' }],
      [staff({ isActive: false }), 'demo-burger', { success: false, error: 'inactive' }],
      [staff({ brand: null }), 'demo-burger', { success: false, error: 'noAccount' }],
      [staff(), 'other-brand', { success: false, error: 'noAccount' }],
    ];
    for (const [user, brandSlug, result] of cases) {
      state.user = user;
      expect(await handleBrandLoginRedirect(brandSlug)).toEqual(result);
    }
    state.user = staff();
    state.saveFails = true;
    expect(await handleBrandLoginRedirect('demo-burger')).toMatchObject({ success: true });

    const lines = logged.flatMap((spy) => spy.mock.calls).map((args) => args.map(String).join(' '));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toContain(EMAIL);
    expect(lines.some((line) => line.includes('user_1'))).toBe(true);
  });
});
