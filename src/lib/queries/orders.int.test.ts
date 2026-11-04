import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { DAY_MS, parseRiyadhDate, riyadhDate, startOfRiyadhDay } from './riyadhDays';

/**
 * What finance sees, against the local database: only confirmed orders are
 * listed and counted, order numbers are searched the way phones store them,
 * and days are Riyadh days although this process runs in another time zone.
 * The brand is created here and tagged per run.
 */

// A server zone far from Riyadh's, where a day taken from the server's clock would show.
process.env.TZ = 'Pacific/Honolulu';

const session = vi.hoisted(() => ({ current: { userId: '', role: 'brand_admin', brandId: null as string | null } }));
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({
    userId: session.current.userId || null,
    sessionClaims: { metadata: { role: session.current.role, brandId: session.current.brandId } },
  }),
}));

const { db } = await import('@/lib/db');
const schema = await import('@/lib/db/schema');
const { getOrders, getOrderDetail } = await import('./orders');
const { getOrderStats, getOrdersOverTime, getOrdersByBranch, getOrdersByDeliveryApp } = await import('./dashboard');
const { getBranches } = await import('./branches');
const { getBranchDetails } = await import('@/actions/brand/getBranchDetails');

const TAG = `fin${Date.now().toString(36)}`;
const ADMIN_CLERK_ID = `user_${TAG}_admin`;
const MINUTE = 60_000;

let brandId = '';
let branch1 = '';
let branch2 = '';
const ids = { today: '', unconfirmed: '', yesterday: '' };

const todayStart = startOfRiyadhDay();
/** Just before midnight in Riyadh: yesterday there, still "today" in many other zones. */
const lastNight = new Date(todayStart.getTime() - MINUTE);
const sameMonth = riyadhDate(lastNight).slice(0, 7) === riyadhDate().slice(0, 7);

beforeAll(async () => {
  const [brand] = await db.insert(schema.brands).values({ name: `Finance Test ${TAG}`, slug: `${TAG}-brand` }).returning();
  brandId = brand.id;
  [branch1, branch2] = (
    await db
      .insert(schema.branches)
      .values([
        { brandId, name: 'Branch 1' },
        { brandId, name: 'Branch 2' },
      ])
      .returning()
  ).map((branch) => branch.id);
  const [catalogApp] = await db.insert(schema.deliveryAppCatalog).values({ name: `${TAG} app` }).returning();
  const [app] = await db.insert(schema.brandDeliveryApps).values({ brandId, catalogAppId: catalogApp.id }).returning();
  const [staff] = await db
    .insert(schema.users)
    .values({ email: `staff.${TAG}@finance.test`, fullName: `Staff ${TAG}`, role: 'staff', brandId, branchId: branch1 })
    .returning();
  await db.insert(schema.users).values({
    email: `admin.${TAG}@finance.test`,
    fullName: `Admin ${TAG}`,
    role: 'brand_admin',
    brandId,
    clerkUserId: ADMIN_CLERK_ID,
  });

  const order = (orderNumber: string, branchId: string, submittedAt: Date, confirmed: boolean, status = 'needs_review') => ({
    brandId,
    branchId,
    orderNumber,
    deliveryAppId: app.id,
    submittedBy: staff.id,
    subtotal: '10.00',
    status,
    submittedAt,
    confirmedAt: confirmed ? submittedAt : null,
  });
  const inserted = await db
    .insert(schema.orders)
    .values([
      order('Q-1234', branch1, new Date(todayStart.getTime() + 60 * MINUTE), true, 'approved'),
      // Its photos never arrived.
      order('Q-5555', branch1, new Date(todayStart.getTime() + 120 * MINUTE), false),
      order('Q-7777', branch2, lastNight, true),
    ])
    .returning({ id: schema.orders.id });
  [ids.today, ids.unconfirmed, ids.yesterday] = inserted.map((row) => row.id);
});

afterAll(async () => {
  await db.delete(schema.orders).where(eq(schema.orders.brandId, brandId));
  await db.delete(schema.users).where(like(schema.users.email, `%.${TAG}@finance.test`));
  await db.delete(schema.brands).where(eq(schema.brands.id, brandId));
  await db.delete(schema.deliveryAppCatalog).where(eq(schema.deliveryAppCatalog.name, `${TAG} app`));
});

const listed = async (params: Omit<Parameters<typeof getOrders>[0], 'brandId'> = {}) => {
  const { rows, total } = await getOrders({ brandId, ...params });
  return { ids: rows.map((row) => row.id).sort(), total };
};

describe('the finance orders list', () => {
  it('lists and counts confirmed orders only', async () => {
    expect(await listed()).toEqual({ ids: [ids.today, ids.yesterday].sort(), total: 2 });
    expect(await getOrderDetail(ids.unconfirmed, brandId)).toBeNull();
    expect(await getOrderDetail(ids.today, brandId)).toMatchObject({ orderNumber: 'Q-1234' });
  });

  it('finds an order number typed with Arabic-Indic digits, a "#" or in lower case', async () => {
    for (const search of ['١٢٣٤', '#١٢٣٤', ' q-1234 ', '1234']) {
      expect(await listed({ search }), search).toEqual({ ids: [ids.today], total: 1 });
    }
    // Staff names are searched as typed; LIKE wildcards are only characters.
    expect((await listed({ search: `Staff ${TAG}` })).total).toBe(2);
    expect((await listed({ search: '%' })).total).toBe(0);
  });

  it('filters by Riyadh days, whatever zone the server runs in', async () => {
    const today = parseRiyadhDate(riyadhDate())!;
    expect(await listed({ dateFrom: today, dateBefore: new Date(today.getTime() + DAY_MS) })).toEqual({ ids: [ids.today], total: 1 });
    const yesterday = new Date(today.getTime() - DAY_MS);
    expect(await listed({ dateFrom: yesterday, dateBefore: today })).toEqual({ ids: [ids.yesterday], total: 1 });
  });
});

describe('the brand dashboard and branch counts', () => {
  it('count confirmed orders, and "today" from midnight in Riyadh', async () => {
    expect(await getOrderStats(brandId)).toEqual({ todayCount: 1, needsReviewCount: 1, monthlyRevenue: 10 });
  });

  it('chart orders by Riyadh day', async () => {
    expect(await getOrdersOverTime(brandId, 30)).toEqual([
      { date: riyadhDate(lastNight), submitted: 1, approved: 0, rejected: 0 },
      { date: riyadhDate(), submitted: 1, approved: 1, rejected: 0 },
    ]);
  });

  it('count this month in Riyadh per branch and delivery app', async () => {
    const byBranch = await getOrdersByBranch(brandId);
    expect(byBranch.map((row) => [row.branchName, Number(row.count)])).toEqual(
      sameMonth ? [['Branch 1', 1], ['Branch 2', 1]] : [['Branch 1', 1]]
    );
    expect(await getOrdersByDeliveryApp(brandId)).toEqual([{ name: `${TAG} app`, value: sameMonth ? 2 : 1 }]);

    const { rows } = await getBranches({ brandId, sort: 'name_asc' });
    expect(rows.map((row) => row.orderCountThisMonth)).toEqual([1, sameMonth ? 1 : 0]);

    session.current = { userId: ADMIN_CLERK_ID, role: 'brand_admin', brandId };
    expect((await getBranchDetails(branch1)).stats).toEqual({ totalOrders: 1, ordersThisMonth: 1 });
    expect((await getBranchDetails(branch2)).stats).toEqual({ totalOrders: 1, ordersThisMonth: sameMonth ? 1 : 0 });
  });
});
