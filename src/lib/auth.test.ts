import { beforeEach, describe, expect, it, vi } from 'vitest';

const clerk = vi.hoisted(() => ({
  session: { userId: null as string | null, sessionClaims: null as unknown },
  getUser: async (): Promise<unknown> => {
    throw Object.assign(new Error('not found'), { status: 404 });
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => clerk.session,
  clerkClient: async () => ({ users: { getUser: () => clerk.getUser() } }),
  currentUser: async () => null,
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
  notFound: () => {
    throw new Error('notFound');
  },
}));

const { requireApiAuth, requireAuth, ORDER_SUBMITTER_ROLES } = await import('./auth');

const signIn = (role: string | undefined, brandId: string | null = 'brand-1') => {
  clerk.session = { userId: 'user_1', sessionClaims: role ? { metadata: { role, brandId } } : {} };
};

async function refusal(result: unknown) {
  expect(result).toBeInstanceOf(Response);
  const response = result as Response;
  return { status: response.status, body: await response.json() };
}

describe('requireApiAuth', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns the session for an allowed role', async () => {
    signIn('staff');
    expect(await requireApiAuth(ORDER_SUBMITTER_ROLES)).toEqual({ userId: 'user_1', role: 'staff', brandId: 'brand-1' });
  });

  it('answers 401 when signed out, instead of redirecting', async () => {
    clerk.session = { userId: null, sessionClaims: null };
    expect(await refusal(await requireApiAuth(['staff']))).toEqual({
      status: 401,
      body: { error: expect.any(String), code: 'unauthenticated' },
    });
  });

  it('answers 403 for another role, so phones stop retrying', async () => {
    signIn('brand_admin');
    expect(await refusal(await requireApiAuth(ORDER_SUBMITTER_ROLES))).toEqual({
      status: 403,
      body: { error: expect.any(String), code: 'forbidden' },
    });
  });

  it("reads the role from Clerk's API when the session token lacks it", async () => {
    signIn(undefined);
    clerk.getUser = async () => ({ publicMetadata: { role: 'finance', brandId: 'brand-2' } });
    expect(await requireApiAuth(['finance'])).toEqual({ userId: 'user_1', role: 'finance', brandId: 'brand-2' });
  });

  it("answers a retryable 500 when Clerk's API fails", async () => {
    signIn(undefined);
    clerk.getUser = async () => {
      throw Object.assign(new Error('bad request'), { status: 400 });
    };
    expect(await refusal(await requireApiAuth(['staff']))).toMatchObject({ status: 500, body: { code: 'server_error' } });
  });
});

describe('requireAuth (pages)', () => {
  it('still redirects', async () => {
    clerk.session = { userId: null, sessionClaims: null };
    await expect(requireAuth(['staff'])).rejects.toThrow('redirect /sign-in');
    signIn('finance');
    await expect(requireAuth(['staff'])).rejects.toThrow('redirect /');
    expect(await requireAuth(['finance', 'brand_admin'])).toMatchObject({ role: 'finance' });
  });
});
