import { describe, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => ({ set: vi.fn(() => ({ where: async () => {} })) }));

vi.mock('@/lib/auth', () => ({
  requireAuth: async () => ({ userId: 'user_1', role: 'brand_admin', brandId: '0f8b7c2e-1d2a-4b3c-8d4e-5f6a7b8c9d0e' }),
}));
vi.mock('@/lib/db', () => ({
  db: {
    query: { brands: { findFirst: async () => ({ slug: 'demo-burger' }) } },
    update: () => ({ set: saved.set }),
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { updateBrandIdentity } = await import('./updateBrandIdentity');

const COLORS = { primary: '#4fc5df', background: '#172b49', surface: '#ffffff', textAccent: '#4fc5df' };

describe('updateBrandIdentity', () => {
  it('saves the validated colours, never other keys sent along with them', async () => {
    const brandColors = { ...COLORS, danger: 'red}</style><meta http-equiv="refresh" content="0;url=https://evil.example">' };
    expect(await updateBrandIdentity({ name: 'Demo Burger', logoUrl: null, brandColors })).toEqual({ success: true });
    expect(saved.set).toHaveBeenCalledWith(expect.objectContaining({ name: 'Demo Burger', logoUrl: null, brandColors: COLORS }));
  });
});
