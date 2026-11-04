import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { and, eq, inArray, like } from 'drizzle-orm';
import { normalizeOrderNumber } from '@/lib/orders/input';

/**
 * Adversarial integration tests for the staff order-submission flow, run with
 * the real route handlers, the real local Postgres and the local storage
 * driver. They pin what the order APIs guarantee: tenant isolation,
 * ownership, idempotency, validated input, one order per number, and an
 * error code the phone can act on instead of a 500. If one goes red, a
 * boundary broke.
 *
 *   npm run test:integration -- src/test/attacks.int.test.ts
 *
 * Only Clerk's session is mocked: the routes' real requireApiAuth, role
 * check included, runs on it. The middleware (src/proxy.ts) is not involved.
 * Each run tags its data on its own, so runs from other checkouts sharing the
 * local database can't delete each other's rows.
 */

const session = vi.hoisted(() => ({
  current: { userId: '', role: 'staff' as string, brandId: null as string | null },
}));
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({
    userId: session.current.userId || null,
    sessionClaims: { metadata: { role: session.current.role, brandId: session.current.brandId } },
  }),
}));

const storageRoot = await mkdtemp(path.join(os.tmpdir(), 'scamurai-attacks-'));
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = storageRoot;

const { db } = await import('@/lib/db');
const schema = await import('@/lib/db/schema');
const uploadUrls = await import('@/app/api/orders/upload-urls/route');
const confirm = await import('@/app/api/orders/[orderId]/confirm/route');
const signedUrls = await import('@/app/api/orders/[orderId]/signed-urls/route');
const localStorage = await import('@/app/api/storage/local/route');

const TAG = `atk${Date.now().toString(36)}`;
const EMAIL = (who: string) => `${who}.${TAG}@attacks.test`;
const JPEG = (marker: number) => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, marker, 0x10, 0x4a, 0x46]);
const HOUR = 60 * 60 * 1000;

// Brand A = seeded demo-burger. Brand B = created here with the TAG.
let brandA = '';
let branchA = '';
let branchA2 = '';
let deliveryAppA = '';
let deliveryAppA2 = '';
let brandB = '';
let branchB1 = '';
let branchB2 = '';
let deliveryAppB = '';
/** Turned off from the start. */
let deliveryAppBOff = '';
/** Turned off by a test, after an order was captured with it. */
let deliveryAppBLater = '';

const clerk = {
  a1: `user_${TAG}_a1`, // staff, brand A, branch A
  a2: `user_${TAG}_a2`, // staff, brand A, branch A (a colleague)
  finA: `user_${TAG}_finA`, // finance, brand A
  b: `user_${TAG}_b`, // staff, brand B, branch B1
  finB: `user_${TAG}_finB`, // finance, brand B
};

const absolute = (url: string) => new URL(url, 'http://localhost:3000').toString();
const orderParams = (orderId: string) => ({ params: Promise.resolve({ orderId }) });

const asStaff = (userId: string, brandId: string) => (session.current = { userId, role: 'staff', brandId });
const asFinance = (userId: string, brandId: string) => (session.current = { userId, role: 'finance', brandId });

type UploadOpts = {
  clerkId?: string;
  sessionBrandId?: string;
  deliveryAppId?: string;
  subtotal?: unknown;
  notes?: unknown;
  currency?: unknown;
  clientOrderId?: string;
  savedByUserId?: unknown;
};

/** POSTs a raw body to upload-urls as the current session. */
async function post(body: string) {
  const response = await uploadUrls.POST(new Request('http://localhost:3000/api/orders/upload-urls', { method: 'POST', body }));
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function requestUploads(orderNumber: unknown, opts: UploadOpts = {}) {
  asStaff(opts.clerkId ?? clerk.a1, opts.sessionBrandId ?? brandA);
  const body: Record<string, unknown> = {
    orderNumber,
    deliveryAppId: opts.deliveryAppId ?? deliveryAppA,
    subtotal: 'subtotal' in opts ? opts.subtotal : '42.50',
  };
  for (const key of ['notes', 'currency', 'clientOrderId', 'savedByUserId'] as const) {
    if (key in opts) body[key] = opts[key];
  }
  return post(JSON.stringify(body));
}

async function put(target: { url: string; headers: Record<string, string> }, body: Uint8Array) {
  return localStorage.PUT(new Request(absolute(target.url), { method: 'PUT', headers: target.headers, body: Buffer.from(body) }));
}

async function confirmAs(clerkId: string, orderId: string, brandId = brandA) {
  asStaff(clerkId, brandId);
  const response = await confirm.PATCH(new Request('http://localhost:3000', { method: 'PATCH', body: '{}' }), orderParams(orderId));
  return { status: response.status, body: await response.json().catch(() => null) };
}

/** Create + upload + confirm a real order owned by `clerkId` in brand A. Returns its id. */
async function makeConfirmedOrder(orderNumber: string, clerkId = clerk.a1) {
  const { status, body } = await requestUploads(orderNumber, { clerkId });
  if (status !== 200) throw new Error(`upload-urls answered ${status}: ${JSON.stringify(body)}`);
  const orderId = body.orderId as string;
  await put(body.uploads.sealed, JPEG(1));
  await put(body.uploads.opened, JPEG(2));
  expect((await confirmAs(clerkId, orderId)).status).toBe(200);
  return orderId;
}

const storedOrder = (orderId: string) =>
  db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1).then((r) => r[0] ?? null);

/** Rows stored under a number, deleted ones included. */
const countOrders = (orderNumber: string) => db.$count(schema.orders, eq(schema.orders.orderNumber, normalizeOrderNumber(orderNumber)));

/** Makes an upload look untried for `ms`. */
const age = (orderId: string, ms: number) =>
  db.update(schema.orders).set({ updatedAt: new Date(Date.now() - ms) }).where(eq(schema.orders.id, orderId));

async function cleanup() {
  // Every order of a tagged user first, so deleting the users can't hit
  // orders_submitted_by_users_id_fk.
  const mine = await db.select({ id: schema.users.id }).from(schema.users).where(like(schema.users.email, `%.${TAG}@attacks.test`));
  const ids = mine.map((u) => u.id);
  if (ids.length) await db.delete(schema.orders).where(inArray(schema.orders.submittedBy, ids));
  await db.delete(schema.users).where(like(schema.users.email, `%.${TAG}@attacks.test`));
  // Cascades to brand B's branches, delivery apps and anything left in them.
  await db.delete(schema.brands).where(eq(schema.brands.slug, `${TAG}-brand-b`));
  await db.delete(schema.deliveryAppCatalog).where(like(schema.deliveryAppCatalog.name, `${TAG} app %`));
}

beforeAll(async () => {
  const [a] = await db.select().from(schema.brands).where(eq(schema.brands.slug, 'demo-burger'));
  if (!a) throw new Error('Seeded demo-burger brand missing; the integration DB must be seeded.');
  brandA = a.id;
  const aBranches = await db.select().from(schema.branches).where(eq(schema.branches.brandId, brandA)).limit(2);
  const aApps = await db
    .select()
    .from(schema.brandDeliveryApps)
    .where(and(eq(schema.brandDeliveryApps.brandId, brandA), eq(schema.brandDeliveryApps.isActive, true)))
    .limit(2);
  [branchA, branchA2] = aBranches.map((branch) => branch.id);
  [deliveryAppA, deliveryAppA2] = aApps.map((app) => app.id);

  // Brand B: a second tenant, fully isolated from demo-burger.
  const [b] = await db.insert(schema.brands).values({ name: `AttackAudit Brand B ${TAG}`, slug: `${TAG}-brand-b` }).returning();
  brandB = b.id;
  const branches = await db
    .insert(schema.branches)
    .values([
      { brandId: brandB, name: 'AttackAudit Branch 1' },
      { brandId: brandB, name: 'AttackAudit Branch 2' },
    ])
    .returning();
  branchB1 = branches[0].id;
  branchB2 = branches[1].id;
  const catalog = await db
    .insert(schema.deliveryAppCatalog)
    .values([1, 2, 3].map((n) => ({ name: `${TAG} app ${n}` })))
    .returning();
  const bApps = await db
    .insert(schema.brandDeliveryApps)
    .values(catalog.map((app, i) => ({ brandId: brandB, catalogAppId: app.id, isActive: i !== 1 })))
    .returning();
  [deliveryAppB, deliveryAppBOff, deliveryAppBLater] = bApps.map((app) => app.id);

  await db.insert(schema.users).values([
    { email: EMAIL('a1'), fullName: 'Attack Staff A1', role: 'staff', brandId: brandA, branchId: branchA, clerkUserId: clerk.a1 },
    { email: EMAIL('a2'), fullName: 'Attack Staff A2', role: 'staff', brandId: brandA, branchId: branchA, clerkUserId: clerk.a2 },
    { email: EMAIL('finA'), fullName: 'Attack Finance A', role: 'finance', brandId: brandA, clerkUserId: clerk.finA },
    { email: EMAIL('b'), fullName: 'Attack Staff B', role: 'staff', brandId: brandB, branchId: branchB1, clerkUserId: clerk.b },
    { email: EMAIL('finB'), fullName: 'Attack Finance B', role: 'finance', brandId: brandB, clerkUserId: clerk.finB },
  ]);
});

afterAll(async () => {
  await cleanup();
  await rm(storageRoot, { recursive: true, force: true });
});

// ───────────────────────────────────────────────────────────────────────────
// Cross-tenant isolation.
// ───────────────────────────────────────────────────────────────────────────
describe('cross-tenant isolation (upload-urls / confirm / signed-urls)', () => {
  it("rejects a deliveryAppId that belongs to another brand", async () => {
    const res = await requestUploads(`${TAG}-xbrand-app`, { clerkId: clerk.a1, deliveryAppId: deliveryAppB });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'app_unavailable', error: expect.stringMatching(/not available for this brand/i) });
  });

  it("refuses to reuse another staff member's clientOrderId (same brand)", async () => {
    const clientOrderId = crypto.randomUUID();
    const first = await requestUploads(`${TAG}-coid-1`, { clerkId: clerk.a1, clientOrderId });
    expect(first.status).toBe(200);
    // A2 is a colleague in the same brand/branch; the id is not theirs.
    const hijack = await requestUploads(`${TAG}-coid-2`, { clerkId: clerk.a2, clientOrderId });
    expect(hijack.status).toBe(409);
    expect(hijack.body.code).toBe('order_conflict');
  });

  it("refuses to reuse another BRAND's clientOrderId", async () => {
    const clientOrderId = crypto.randomUUID();
    const first = await requestUploads(`${TAG}-coid-b1`, { clerkId: clerk.a1, clientOrderId });
    expect(first.status).toBe(200);
    const hijack = await requestUploads(`${TAG}-coid-b2`, { clerkId: clerk.b, sessionBrandId: brandB, deliveryAppId: deliveryAppB, clientOrderId });
    expect(hijack.status).toBe(409);
    expect(hijack.body.code).toBe('order_conflict');
  });

  it("will not let a colleague confirm another staff member's order", async () => {
    // Fresh order by A1 that A2 tries to confirm.
    const { body } = await requestUploads(`${TAG}-own-2`, { clerkId: clerk.a1 });
    await put(body.uploads.sealed, JPEG(1));
    await put(body.uploads.opened, JPEG(2));
    const res = await confirmAs(clerk.a2, body.orderId);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
  });

  it("will not let brand B staff confirm a brand A order", async () => {
    const { body } = await requestUploads(`${TAG}-xbrand-confirm`, { clerkId: clerk.a1 });
    await put(body.uploads.sealed, JPEG(1));
    await put(body.uploads.opened, JPEG(2));
    expect((await confirmAs(clerk.b, body.orderId, brandB)).status).toBe(404);
  });

  it('refuses to confirm before both photos exist', async () => {
    const { body } = await requestUploads(`${TAG}-nophotos`, { clerkId: clerk.a1 });
    const res = await confirmAs(clerk.a1, body.orderId);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('photos_missing');
  });

  it("hides a brand A order's signed photo URLs from brand B finance", async () => {
    const orderId = await makeConfirmedOrder(`${TAG}-signed`, clerk.a1);
    asFinance(clerk.finB, brandB);
    const res = await signedUrls.GET(new Request('http://localhost:3000'), orderParams(orderId));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'not_found' });
  });

  it('gives the order-brand finance working signed URLs (positive control)', async () => {
    const orderId = await makeConfirmedOrder(`${TAG}-signed-ok`, clerk.a1);
    asFinance(clerk.finA, brandA);
    const res = await signedUrls.GET(new Request('http://localhost:3000'), orderParams(orderId));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.images.sealed.full).toContain('/api/storage/local');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Roles: answered as JSON the phone can act on, never a redirect (a redirect
// inside the handlers' try/catch used to become a 500, retried forever).
// ───────────────────────────────────────────────────────────────────────────
describe('roles on the order APIs', () => {
  const uploadRequest = () =>
    new Request('http://localhost:3000/api/orders/upload-urls', {
      method: 'POST',
      body: JSON.stringify({ orderNumber: `${TAG}-role`, deliveryAppId: deliveryAppA, subtotal: '10.00' }),
    });

  it('refuses a brand admin on the staff APIs with 403 forbidden', async () => {
    session.current = { userId: clerk.finA, role: 'brand_admin', brandId: brandA };
    const res = await uploadUrls.POST(uploadRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'forbidden' });
    const confirmed = await confirm.PATCH(new Request('http://localhost:3000', { method: 'PATCH' }), orderParams(crypto.randomUUID()));
    expect(confirmed.status).toBe(403);
  });

  it('refuses staff on the finance photo URLs', async () => {
    const orderId = await makeConfirmedOrder(`${TAG}-role-signed`, clerk.a1);
    asStaff(clerk.a1, brandA);
    const res = await signedUrls.GET(new Request('http://localhost:3000'), orderParams(orderId));
    expect(res.status).toBe(403);
  });

  it('answers 401 unauthenticated when signed out', async () => {
    session.current = { userId: '', role: 'staff', brandId: null };
    const res = await uploadUrls.POST(uploadRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'unauthenticated' });
  });

  it('answers 429 rate_limited once one user sends more than 120 confirms in 10 minutes', async () => {
    asStaff(`user_${TAG}_flood`, brandA);
    const statuses: number[] = [];
    let last: Response | undefined;
    for (let i = 0; i <= 120; i++) {
      last = await confirm.PATCH(new Request('http://localhost:3000', { method: 'PATCH' }), orderParams(crypto.randomUUID()));
      statuses.push(last.status);
    }
    expect(statuses.slice(0, 120)).not.toContain(429);
    expect(statuses[120]).toBe(429);
    expect(await last!.json()).toMatchObject({ code: 'rate_limited' });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// One live order per brand, branch, delivery app and number.
// ───────────────────────────────────────────────────────────────────────────
describe('order number uniqueness', () => {
  it('blocks a duplicate order number in the same branch once confirmed, even for a different staff member', async () => {
    await makeConfirmedOrder(`${TAG}-dup`, clerk.a1);
    const res = await requestUploads(`${TAG}-dup`, { clerkId: clerk.a2 }); // same brand+branch, different staff
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'duplicate_order', error: expect.stringMatching(/already exists/i) });
  });

  it('reads Arabic-Indic digits as the same number', async () => {
    const orderId = await makeConfirmedOrder(`${TAG}-٤٥٦`, clerk.a1);
    expect((await storedOrder(orderId))?.orderNumber).toBe(normalizeOrderNumber(`${TAG}-456`));
    const res = await requestUploads(`${TAG}-456`, { clerkId: clerk.a2 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('duplicate_order');
  });

  it('allows the same order number for another delivery app', async () => {
    await makeConfirmedOrder(`${TAG}-twoapps`, clerk.a1);
    const res = await requestUploads(`${TAG}-twoapps`, { clerkId: clerk.a2, deliveryAppId: deliveryAppA2 });
    expect(res.status).toBe(200);
  });

  it('allows the same order number in two different branches of the same brand', async () => {
    // Brand B has two branches; staff B is in branch B1. Move the order number
    // through both branches by reassigning the staff user's branch.
    await db.update(schema.users).set({ branchId: branchB1 }).where(eq(schema.users.clerkUserId, clerk.b));
    const first = await requestUploads(`${TAG}-twobranch`, { clerkId: clerk.b, sessionBrandId: brandB, deliveryAppId: deliveryAppB });
    expect(first.status).toBe(200);
    await db.update(schema.users).set({ branchId: branchB2 }).where(eq(schema.users.clerkUserId, clerk.b));
    const second = await requestUploads(`${TAG}-twobranch`, { clerkId: clerk.b, sessionBrandId: brandB, deliveryAppId: deliveryAppB });
    expect(second.status).toBe(200);
    expect(second.body.orderId).not.toBe(first.body.orderId);
    await db.update(schema.users).set({ branchId: branchB1 }).where(eq(schema.users.clerkUserId, clerk.b));
  });

  it('stores a SQL-injection-style order number as data (parameterised, no injection)', async () => {
    const evil = `${TAG}-'; DROP TABLE orders;--`;
    const res = await requestUploads(evil, { clerkId: clerk.a1 });
    expect(res.status).toBe(200);
    expect((await storedOrder(res.body.orderId))?.orderNumber).toBe(normalizeOrderNumber(evil));
  });
});

// ───────────────────────────────────────────────────────────────────────────
// A retry is recognised by the phone's clientOrderId only.
// ───────────────────────────────────────────────────────────────────────────
describe('retries and resubmissions', () => {
  it('refuses another submission of a number that is still uploading, and leaves the first intact', async () => {
    const first = crypto.randomUUID();
    expect((await requestUploads(`${TAG}-twice`, { clientOrderId: first, subtotal: '42.50' })).status).toBe(200);
    const second = await requestUploads(`${TAG}-twice`, { clientOrderId: crypto.randomUUID(), subtotal: '99.00' });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('duplicate_order');

    // The first order is untouched and still finishes with its own photos.
    const again = await requestUploads(`${TAG}-twice`, { clientOrderId: first, subtotal: '42.50' });
    await put(again.body.uploads.sealed, JPEG(11));
    await put(again.body.uploads.opened, JPEG(12));
    expect((await confirmAs(clerk.a1, first)).status).toBe(200);
    expect(await countOrders(`${TAG}-twice`)).toBe(1);
    expect(await storedOrder(first)).toMatchObject({ subtotal: '42.50' });
  });

  it('resumes after the worker was moved to another branch, and keeps the order where it was captured', async () => {
    const clientOrderId = crypto.randomUUID();
    expect((await requestUploads(`${TAG}-moved`, { clientOrderId })).status).toBe(200);
    await db.update(schema.users).set({ branchId: branchA2 }).where(eq(schema.users.clerkUserId, clerk.a1));
    try {
      const again = await requestUploads(`${TAG}-moved`, { clientOrderId });
      expect(again.status).toBe(200);
      expect(again.body.orderId).toBe(clientOrderId);
      await put(again.body.uploads.sealed, JPEG(13));
      await put(again.body.uploads.opened, JPEG(14));
      expect((await confirmAs(clerk.a1, clientOrderId)).status).toBe(200);
      expect((await storedOrder(clientOrderId))?.branchId).toBe(branchA);
    } finally {
      await db.update(schema.users).set({ branchId: branchA }).where(eq(schema.users.clerkUserId, clerk.a1));
    }
  });

  it('stores what the worker corrected when the same submission is sent again', async () => {
    const clientOrderId = crypto.randomUUID();
    expect((await requestUploads(`${TAG}-fix`, { clientOrderId, subtotal: '4250' })).status).toBe(200);
    const corrected = await requestUploads(`${TAG}-fix-2`, {
      clientOrderId,
      subtotal: '42.50',
      notes: ' bag torn ',
      deliveryAppId: deliveryAppA2,
    });
    expect(corrected.status).toBe(200);
    expect(await storedOrder(clientOrderId)).toMatchObject({
      orderNumber: normalizeOrderNumber(`${TAG}-fix-2`),
      subtotal: '42.50',
      notes: 'bag torn',
      deliveryAppId: deliveryAppA2,
    });
  });

  it('lists only the photos storage does not have yet', async () => {
    const clientOrderId = crypto.randomUUID();
    const first = await requestUploads(`${TAG}-half`, { clientOrderId });
    expect(Object.keys(first.body.uploads).sort()).toEqual(['opened', 'sealed']);
    await put(first.body.uploads.sealed, JPEG(15));
    const again = await requestUploads(`${TAG}-half`, { clientOrderId });
    expect(Object.keys(again.body.uploads)).toEqual(['opened']);
  });

  it('answers both of two attempts of one submission sent at once, with one order', async () => {
    const clientOrderId = crypto.randomUUID();
    const answers = await Promise.all([1, 2].map(() => requestUploads(`${TAG}-burst`, { clientOrderId })));
    expect(answers.map((answer) => [answer.status, answer.body.orderId])).toEqual([
      [200, clientOrderId],
      [200, clientOrderId],
    ]);
    expect(await countOrders(`${TAG}-burst`)).toBe(1);
  });

  it('gives one of two submissions of a number sent at once duplicate_order, never a 500', async () => {
    const answers = await Promise.all(
      [clerk.a1, clerk.a2].map((clerkId) => requestUploads(`${TAG}-race`, { clerkId, clientOrderId: crypto.randomUUID() }))
    );
    expect(answers.map((answer) => answer.status).sort()).toEqual([200, 409]);
    expect(answers.find((answer) => answer.status === 409)?.body.code).toBe('duplicate_order');
    expect(await countOrders(`${TAG}-race`)).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// A colleague's upload whose photos never arrived (phone lost, data cleared)
// gives its number up after 2 hours without an attempt.
// ───────────────────────────────────────────────────────────────────────────
describe('abandoned uploads', () => {
  it("takes over a colleague's upload no phone tried for 2 hours, and says so in the log", async () => {
    const stale = crypto.randomUUID();
    expect((await requestUploads(`${TAG}-stale`, { clientOrderId: stale })).status).toBe(200);
    await age(stale, 3 * HOUR);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const taker = crypto.randomUUID();
    const res = await requestUploads(`${TAG}-stale`, { clerkId: clerk.a2, clientOrderId: taker });
    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe(taker);
    expect(warn).toHaveBeenCalledWith('[orders] taken over', expect.stringContaining(`"orderId":"${stale}"`));
    warn.mockRestore();
    expect((await storedOrder(stale))?.deletedAt).not.toBeNull();

    // The first phone, back online, learns its order was replaced.
    const back = await requestUploads(`${TAG}-stale`, { clientOrderId: stale });
    expect(back.status).toBe(409);
    expect(back.body.code).toBe('duplicate_order');
  });

  it('keeps blocking the number while the upload is recent', async () => {
    expect((await requestUploads(`${TAG}-fresh`, { clientOrderId: crypto.randomUUID() })).status).toBe(200);
    const res = await requestUploads(`${TAG}-fresh`, { clerkId: clerk.a2, clientOrderId: crypto.randomUUID() });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('duplicate_order');
  });

  it("never takes over the worker's own upload: that one is still on their phone", async () => {
    const own = crypto.randomUUID();
    expect((await requestUploads(`${TAG}-own-old`, { clientOrderId: own })).status).toBe(200);
    await age(own, 3 * HOUR);
    const res = await requestUploads(`${TAG}-own-old`, { clientOrderId: crypto.randomUUID() });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('duplicate_order');
  });

  it('refuses to confirm an order that was taken over while its photos were on their way', async () => {
    const stale = crypto.randomUUID();
    const first = await requestUploads(`${TAG}-late`, { clientOrderId: stale });
    await put(first.body.uploads.sealed, JPEG(16));
    await put(first.body.uploads.opened, JPEG(17));
    await age(stale, 3 * HOUR);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await requestUploads(`${TAG}-late`, { clerkId: clerk.a2, clientOrderId: crypto.randomUUID() })).status).toBe(200);
    warn.mockRestore();

    const late = await confirmAs(clerk.a1, stale);
    expect(late.status).toBe(409);
    expect(late.body.code).toBe('duplicate_order');
    expect((await storedOrder(stale))?.confirmedAt).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Delivery apps the brand turned off.
// ───────────────────────────────────────────────────────────────────────────
describe('delivery apps', () => {
  // Read when a test runs: brand B only exists once beforeAll is done.
  const asB = () => ({ clerkId: clerk.b, sessionBrandId: brandB });

  it('refuses an app the brand turned off with app_unavailable', async () => {
    const res = await requestUploads(`${TAG}-off`, { ...asB(), deliveryAppId: deliveryAppBOff });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('app_unavailable');
  });

  it('still resumes an order captured with an app that was turned off since', async () => {
    const opts = { ...asB(), deliveryAppId: deliveryAppBLater, clientOrderId: crypto.randomUUID() };
    expect((await requestUploads(`${TAG}-later`, opts)).status).toBe(200);
    await db.update(schema.brandDeliveryApps).set({ isActive: false }).where(eq(schema.brandDeliveryApps.id, deliveryAppBLater));

    const again = await requestUploads(`${TAG}-later`, opts);
    expect(again.status).toBe(200);
    expect(again.body.orderId).toBe(opts.clientOrderId);
    // A new order can't use it any more.
    const fresh = await requestUploads(`${TAG}-later-2`, { ...opts, clientOrderId: crypto.randomUUID() });
    expect(fresh.body.code).toBe('app_unavailable');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Input upload-urls refuses: never stored, never a 500 (which phones retry).
// ───────────────────────────────────────────────────────────────────────────
describe('what upload-urls refuses', () => {
  it('leaves an order saved under another account waiting for its owner (other_account)', async () => {
    const res = await requestUploads(`${TAG}-shared`, { savedByUserId: clerk.a2 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('other_account');
    expect(await countOrders(`${TAG}-shared`)).toBe(0);
    expect((await requestUploads(`${TAG}-shared`, { savedByUserId: clerk.a1 })).status).toBe(200);
  });

  it.each([
    ['a negative amount', -999999],
    ['NaN, which would poison SUM(subtotal)', 'NaN'],
    ['Infinity', 'Infinity'],
    ['a non-numeric amount', 'abc'],
    ['an amount that overflows numeric(12,2)', '12345678901'],
    ['1e13', 1e13],
    ['no amount', undefined],
  ])('refuses %s as invalid_input on subtotal', async (_, subtotal) => {
    const res = await requestUploads(`${TAG}-amount`, { subtotal });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'invalid_input', field: 'subtotal' });
    expect(await countOrders(`${TAG}-amount`)).toBe(0);
  });

  it('refuses notes over 500 characters, an order number over 40 and any currency but SAR, naming the field', async () => {
    expect((await requestUploads(`${TAG}-notes`, { notes: 'A'.repeat(501) })).body).toMatchObject({ code: 'invalid_input', field: 'notes' });
    expect((await requestUploads('Z'.repeat(41))).body).toMatchObject({ code: 'invalid_input', field: 'orderNumber' });
    expect((await requestUploads(`${TAG}-usd`, { currency: 'USD' })).body).toMatchObject({ code: 'invalid_input', field: 'currency' });
  });

  it('refuses a body over 4 KB unread (1 MB of notes, a 5000-character order number)', async () => {
    for (const res of [await requestUploads(`${TAG}-big`, { notes: 'A'.repeat(1_000_000) }), await requestUploads('Z'.repeat(5000))]) {
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_input');
    }
    expect(await countOrders(`${TAG}-big`)).toBe(0);
  });

  it('refuses a body that is not JSON', async () => {
    asStaff(clerk.a1, brandA);
    const res = await post('orderNumber=1&subtotal=5');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_input');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The order id in the URL ends up in queries and log lines.
// ───────────────────────────────────────────────────────────────────────────
describe('a malformed order id', () => {
  it('is not_found on confirm and signed-urls, before any query or log line', async () => {
    const forged = 'x\n[orders] confirmed {"orderId":"forged","waitedSec":1}';
    const logs = (['error', 'warn', 'info'] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => {}));
    try {
      const res = await confirmAs(clerk.a1, forged);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('not_found');
      asFinance(clerk.finA, brandA);
      expect((await signedUrls.GET(new Request('http://localhost:3000'), orderParams(forged))).status).toBe(404);
      for (const log of logs) expect(log).not.toHaveBeenCalled();
    } finally {
      for (const log of logs) log.mockRestore();
    }
  });
});
