import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, inArray, like, or } from 'drizzle-orm';

/**
 * End-to-end application lifecycle against the real local database:
 * apply → list → quote → pay → approve, plus the guard rails.
 * Only the framework edges are mocked (request headers, after(), Clerk,
 * email, rate limiting, auth).
 */

const edges = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => unknown>,
  createInvitation: vi.fn(async () => ({ id: 'inv_integration' })),
  sendEmail: vi.fn(async () => ({ data: { id: 'email_integration' }, error: null })),
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '127.0.0.1' }) }));
vi.mock('next/server', () => ({ after: (callback: () => unknown) => edges.afterCallbacks.push(callback) }));
vi.mock('next-intl/server', () => ({
  getLocale: async () => 'ar',
  getTranslations: async () => (key: string) => key,
}));
vi.mock('@/lib/email', () => ({ sendEmail: edges.sendEmail }));
vi.mock('@/lib/ratelimit', () => ({ isApplicationRateLimited: async () => false }));
vi.mock('@/lib/auth', () => ({
  requireAuth: async () => ({ userId: 'user_integration_admin', role: 'master_admin', brandId: null }),
}));
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({ invitations: { createInvitation: edges.createInvitation } }),
}));

const { db } = await import('@/lib/db');
const { applications, brands, users } = await import('@/lib/db/schema');
const { submitApplication } = await import('@/actions/submitApplication');
const { updateApplicationStatus } = await import('@/actions/updateApplicationStatus');
const { confirmApplicationPayment } = await import('@/actions/confirmApplicationPayment');
const { approveApplication } = await import('@/actions/approveApplication');
const { getApplications } = await import('@/lib/queries/applications');

/** Everything this file creates carries this tag, so cleanup is exact. */
const TAG = 'inttest';
const email = (name: string) => `${name}.${TAG}@integration.test`;
const ARABIC_ONLY_BRAND = 'مطعم اختبار التكامل';
const TAKEN_BRAND = `Taken Brand ${TAG}`;

const details = (overrides: Record<string, unknown>) => ({
  brandName: `Test Kitchen ${TAG}`,
  contactName: 'Integration Tester',
  phone: '',
  branchCount: '4',
  ...overrides,
});

async function cleanup() {
  const ours = like(applications.contactEmail, `%.${TAG}@integration.test`);
  await db.delete(applications).where(or(ours, inArray(applications.brandName, [ARABIC_ONLY_BRAND, TAKEN_BRAND])));
  await db.delete(users).where(like(users.email, `%.${TAG}@integration.test`));
  await db.delete(brands).where(inArray(brands.name, [ARABIC_ONLY_BRAND, TAKEN_BRAND]));
}

async function findByEmail(address: string) {
  return db.select().from(applications).where(eq(applications.contactEmail, address));
}

beforeAll(cleanup);
afterAll(cleanup);
beforeEach(() => {
  edges.afterCallbacks.length = 0;
  edges.createInvitation.mockClear();
});

describe('submitApplication (public form)', () => {
  it('stores an interest registration with no plan and the visitor locale', async () => {
    const address = email('interest');
    const result = await submitApplication({ ...details({}), service: 'compliance', plan: null, contactEmail: address });

    expect(result).toEqual({ success: true });
    const [row] = await findByEmail(address);
    expect(row).toMatchObject({ service: 'compliance', plan: null, status: 'pending', locale: 'ar', branchCount: 4 });
    expect(edges.afterCallbacks).toHaveLength(1);
  });

  it('answers a repeat request with success but stores no second row', async () => {
    const address = email('interest');
    const result = await submitApplication({ ...details({}), service: 'compliance', contactEmail: address });

    expect(result).toEqual({ success: true });
    expect(await findByEmail(address)).toHaveLength(1);
    expect(edges.afterCallbacks).toHaveLength(1); // admins still hear about it
  });

  it('turns away existing accounts for live services but accepts their interest', async () => {
    const address = email('customer');
    await db.insert(users).values({ email: address, fullName: 'Existing customer', role: 'brand_admin' });

    const live = await submitApplication({ ...details({}), service: 'dispute_orders', plan: 'growth', contactEmail: address });
    expect(live).toEqual({ success: false, error: 'errorEmailRegistered' });

    const interest = await submitApplication({ ...details({}), service: 'receiving', contactEmail: address });
    expect(interest).toEqual({ success: true });
  });

  it('silently drops honeypot submissions', async () => {
    const address = email('bot');
    const result = await submitApplication({ ...details({}), service: 'compliance', contactEmail: address, website: 'spam' });

    expect(result).toEqual({ success: true });
    expect(await findByEmail(address)).toHaveLength(0);
  });

  it('rejects invalid input with field errors', async () => {
    const result = await submitApplication({ service: 'dispute_orders', brandName: 'x' });
    expect(result.success).toBe(false);
    expect(!result.success && result.error).toBe('errFormFix');
  });
});

describe('admin lifecycle: quote → pay → approve', () => {
  it('activates a paid application and invites its admin', async () => {
    const address = email('lifecycle');
    await submitApplication({
      ...details({ brandName: ARABIC_ONLY_BRAND }),
      service: 'dispute_orders',
      plan: 'growth',
      contactEmail: address,
    });
    const [submitted] = await findByEmail(address);

    const list = await getApplications(
      { status: 'pending', service: 'dispute_orders', plan: 'all', search: address, sort: 'newest', page: 1 },
      20
    );
    expect(list.total).toBe(1);
    expect(list.rows.map((row) => row.id)).toEqual([submitted.id]);
    expect(list.counts.pending).toBe(1);

    expect(await updateApplicationStatus({ id: submitted.id, expectedStatus: 'pending', status: 'quoted' })).toEqual({ success: true });
    // A stale screen can't apply the same change twice.
    expect(await updateApplicationStatus({ id: submitted.id, expectedStatus: 'pending', status: 'quoted' })).toEqual({
      success: false,
      error: 'conflict',
    });
    // Approval is impossible before payment.
    expect(await approveApplication({ id: submitted.id })).toMatchObject({ success: false, error: 'conflict' });

    expect(await confirmApplicationPayment({ id: submitted.id, paymentReference: 'TRX-INT-0001' })).toEqual({ success: true });
    const approval = await approveApplication({ id: submitted.id });
    expect(approval).toEqual({ success: true, invitationSent: true });

    const [approved] = await findByEmail(address);
    expect(approved).toMatchObject({ status: 'approved', paymentReference: 'TRX-INT-0001', paymentConfirmedBy: 'user_integration_admin' });
    expect(approved.quotedAt).toBeInstanceOf(Date);
    expect(approved.paidAt).toBeInstanceOf(Date);
    expect(approved.approvedAt).toBeInstanceOf(Date);

    const [brand] = await db.select().from(brands).where(eq(brands.id, approved.brandId!));
    expect(brand).toMatchObject({ name: ARABIC_ONLY_BRAND, plan: 'growth' });
    expect(brand.slug).toMatch(/^brand-[a-z0-9]+$/); // Arabic-only name → fallback slug

    const [admin] = await db.select().from(users).where(eq(users.email, address));
    expect(admin).toMatchObject({ role: 'brand_admin', brandId: brand.id, onboardingComplete: false });

    expect(edges.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: address,
        redirectUrl: expect.stringMatching(/\/ar\/onboarding\/brand-setup$/),
        publicMetadata: expect.objectContaining({ role: 'brand_admin', brandId: brand.id }),
      })
    );
  });

  it('refuses to quote when approval would fail later (brand name taken)', async () => {
    await db.insert(brands).values({ name: TAKEN_BRAND, slug: 'taken-brand-inttest' });
    const address = email('taken');
    await submitApplication({ ...details({ brandName: TAKEN_BRAND }), service: 'dispute_orders', plan: 'starter', contactEmail: address });
    const [row] = await findByEmail(address);

    expect(await updateApplicationStatus({ id: row.id, expectedStatus: 'pending', status: 'quoted' })).toEqual({
      success: false,
      error: 'brandNameTaken',
    });
  });

  it('only lets interest registrations be rejected, and records why', async () => {
    const [row] = await findByEmail(email('interest'));

    expect(await updateApplicationStatus({ id: row.id, expectedStatus: 'pending', status: 'quoted' })).toEqual({
      success: false,
      error: 'serviceNotLive',
    });

    const rejected = await updateApplicationStatus({
      id: row.id,
      expectedStatus: 'pending',
      status: 'rejected',
      rejectionNote: 'Not in our first launch region',
    });
    expect(rejected).toEqual({ success: true });

    const [after] = await findByEmail(email('interest'));
    expect(after).toMatchObject({ status: 'rejected', rejectionNote: 'Not in our first launch region' });
    expect(after.rejectedAt).toBeInstanceOf(Date);
    expect(edges.afterCallbacks).toHaveLength(1); // rejection email scheduled
  });
});
