import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, inArray, like } from 'drizzle-orm';

/**
 * Adversarial integration tests for the staff order-submission flow, run with
 * the real route handlers, the real local Postgres and the local storage
 * driver. Only the signed-in user is mocked (like orderUpload.int.test.ts).
 *
 *   npm run test:integration -- src/test/attacks.int.test.ts
 *
 * Two kinds of test live here:
 *   - Passing it(...) tests pin security properties that HOLD today
 *     (cross-tenant isolation, ownership, idempotency). They are regression
 *     guards: if one ever goes red, a boundary broke.
 *   - it.fails(...) tests assert the SECURE behaviour for an input-validation
 *     gap that is NOT yet enforced. They pass today precisely because the app
 *     is still vulnerable; when the gap is fixed, remove the `.fails` and the
 *     secure assertion becomes a normal guard.
 *
 * IMPORTANT: the mock replaces requireAuth with a function that returns the
 * current session verbatim and IGNORES the allowedRoles argument. Role
 * enforcement therefore lives in the real requireAuth + middleware, NOT here;
 * these tests exercise the per-route tenant/ownership/validation logic.
 */

const session = vi.hoisted(() => ({
  current: { userId: '', role: 'staff' as string, brandId: null as string | null },
}));
vi.mock('@/lib/auth', () => ({ requireAuth: async () => session.current }));

const storageRoot = await mkdtemp(path.join(os.tmpdir(), 'scamurai-attacks-'));
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = storageRoot;

const { db } = await import('@/lib/db');
const schema = await import('@/lib/db/schema');
const uploadUrls = await import('@/app/api/orders/upload-urls/route');
const confirm = await import('@/app/api/orders/[orderId]/confirm/route');
const signedUrls = await import('@/app/api/orders/[orderId]/signed-urls/route');
const localStorage = await import('@/app/api/storage/local/route');

const TAG = 'attackaudit';
const EMAIL = (who: string) => `${who}.${TAG}@attacks.test`;
const JPEG = (marker: number) => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, marker, 0x10, 0x4a, 0x46]);

// Brand A = seeded demo-burger. Brand B = created here with the TAG.
let brandA = '';
let branchA = '';
let deliveryAppA = '';
let brandB = '';
let branchB1 = '';
let branchB2 = '';
let deliveryAppB = '';
let catalogAppB = '';

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
};

async function requestUploads(orderNumber: unknown, opts: UploadOpts = {}) {
  const clerkId = opts.clerkId ?? clerk.a1;
  asStaff(clerkId, opts.sessionBrandId ?? brandA);
  const body: Record<string, unknown> = {
    orderNumber,
    deliveryAppId: opts.deliveryAppId ?? deliveryAppA,
  };
  if ('subtotal' in opts) body.subtotal = opts.subtotal;
  if ('notes' in opts) body.notes = opts.notes;
  if ('currency' in opts) body.currency = opts.currency;
  if (opts.clientOrderId) body.clientOrderId = opts.clientOrderId;
  const response = await uploadUrls.POST(
    new Request('http://localhost:3000/api/orders/upload-urls', { method: 'POST', body: JSON.stringify(body) })
  );
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function put(target: { url: string; headers: Record<string, string> }, body: Uint8Array) {
  return localStorage.PUT(new Request(absolute(target.url), { method: 'PUT', headers: target.headers, body: Buffer.from(body) }));
}

/** Create + upload + confirm a real order owned by `clerkId` in brand A. Returns its id. */
async function makeConfirmedOrder(orderNumber: string, clerkId = clerk.a1) {
  const { body } = await requestUploads(orderNumber, { clerkId });
  const orderId = body.orderId as string;
  await put(body.uploads.sealed, JPEG(1));
  await put(body.uploads.opened, JPEG(2));
  asStaff(clerkId, brandA);
  await confirm.PATCH(new Request('http://localhost:3000', { method: 'PATCH', body: '{}' }), orderParams(orderId));
  return orderId;
}

const storedOrder = (orderId: string) =>
  db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1).then((r) => r[0] ?? null);

async function cleanup() {
  // Delete every order submitted by a tagged user first (covers orders under
  // brand A whose number is NOT TAG-prefixed, e.g. the 5000-char one), so the
  // later users delete can't hit orders_submitted_by_users_id_fk.
  const mine = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(like(schema.users.email, `%.${TAG}@attacks.test`));
  const ids = mine.map((u) => u.id);
  if (ids.length) await db.delete(schema.orders).where(inArray(schema.orders.submittedBy, ids));
  await db.delete(schema.orders).where(like(schema.orders.orderNumber, `${TAG}-%`));
  await db.delete(schema.users).where(like(schema.users.email, `%.${TAG}@attacks.test`));
  // Delete brand B by slug (robust to a previous failed run): cascades its
  // branches + brand_delivery_apps + any remaining orders/images.
  await db.delete(schema.brands).where(eq(schema.brands.slug, 'attackaudit-brand-b'));
  await db.delete(schema.deliveryAppCatalog).where(eq(schema.deliveryAppCatalog.name, `AttackAudit App ${TAG}`));
}

beforeAll(async () => {
  await cleanup();

  const [a] = await db.select().from(schema.brands).where(eq(schema.brands.slug, 'demo-burger'));
  if (!a) throw new Error('Seeded demo-burger brand missing; the integration DB must be seeded.');
  brandA = a.id;
  const [ab] = await db.select().from(schema.branches).where(eq(schema.branches.brandId, brandA)).limit(1);
  const [aApp] = await db.select().from(schema.brandDeliveryApps).where(eq(schema.brandDeliveryApps.brandId, brandA)).limit(1);
  branchA = ab.id;
  deliveryAppA = aApp.id;

  // Brand B: a second tenant, fully isolated from demo-burger.
  const [b] = await db.insert(schema.brands).values({ name: `AttackAudit Brand B ${TAG}`, slug: `attackaudit-brand-b` }).returning();
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
  const [cat] = await db.insert(schema.deliveryAppCatalog).values({ name: `AttackAudit App ${TAG}` }).returning();
  catalogAppB = cat.id;
  const [bApp] = await db.insert(schema.brandDeliveryApps).values({ brandId: brandB, catalogAppId: catalogAppB }).returning();
  deliveryAppB = bApp.id;

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
// Cross-tenant isolation — these properties HOLD today (regression guards).
// ───────────────────────────────────────────────────────────────────────────
describe('cross-tenant isolation (upload-urls / confirm / signed-urls)', () => {
  it("rejects a deliveryAppId that belongs to another brand", async () => {
    const res = await requestUploads(`${TAG}-xbrand-app`, { clerkId: clerk.a1, deliveryAppId: deliveryAppB });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not available for this brand/i);
  });

  it("refuses to reuse another staff member's clientOrderId (same brand)", async () => {
    const clientOrderId = crypto.randomUUID();
    const first = await requestUploads(`${TAG}-coid-1`, { clerkId: clerk.a1, clientOrderId });
    expect(first.status).toBe(200);
    // A2 is a colleague in the same brand/branch; the id is not theirs.
    const hijack = await requestUploads(`${TAG}-coid-2`, { clerkId: clerk.a2, clientOrderId });
    expect(hijack.status).toBe(409);
  });

  it("refuses to reuse another BRAND's clientOrderId", async () => {
    const clientOrderId = crypto.randomUUID();
    const first = await requestUploads(`${TAG}-coid-b1`, { clerkId: clerk.a1, clientOrderId });
    expect(first.status).toBe(200);
    const hijack = await requestUploads(`${TAG}-coid-b2`, { clerkId: clerk.b, sessionBrandId: brandB, deliveryAppId: deliveryAppB, clientOrderId });
    expect(hijack.status).toBe(409);
  });

  it("will not let a colleague confirm another staff member's order", async () => {
    const orderId = await makeConfirmedOrder(`${TAG}-own-1`, clerk.a1);
    // Fresh order by A1 that A2 tries to confirm.
    const { body } = await requestUploads(`${TAG}-own-2`, { clerkId: clerk.a1 });
    const victimOrderId = body.orderId as string;
    await put(body.uploads.sealed, JPEG(1));
    await put(body.uploads.opened, JPEG(2));
    asStaff(clerk.a2, brandA); // A2 confirms A1's order
    const res = await confirm.PATCH(new Request('http://localhost:3000', { method: 'PATCH', body: '{}' }), orderParams(victimOrderId));
    expect(res.status).toBe(404);
    expect(orderId).toBeTruthy();
  });

  it("will not let brand B staff confirm a brand A order", async () => {
    const { body } = await requestUploads(`${TAG}-xbrand-confirm`, { clerkId: clerk.a1 });
    const orderId = body.orderId as string;
    await put(body.uploads.sealed, JPEG(1));
    await put(body.uploads.opened, JPEG(2));
    asStaff(clerk.b, brandB); // brand B staff
    const res = await confirm.PATCH(new Request('http://localhost:3000', { method: 'PATCH', body: '{}' }), orderParams(orderId));
    expect(res.status).toBe(404);
  });

  it('refuses to confirm before both photos exist', async () => {
    const { body } = await requestUploads(`${TAG}-nophotos`, { clerkId: clerk.a1 });
    asStaff(clerk.a1, brandA);
    const res = await confirm.PATCH(new Request('http://localhost:3000', { method: 'PATCH', body: '{}' }), orderParams(body.orderId));
    expect(res.status).toBe(422);
  });

  it("hides a brand A order's signed photo URLs from brand B finance", async () => {
    const orderId = await makeConfirmedOrder(`${TAG}-signed`, clerk.a1);
    asFinance(clerk.finB, brandB);
    const res = await signedUrls.GET(new Request('http://localhost:3000'), orderParams(orderId));
    expect(res.status).toBe(404);
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
// Order-number uniqueness semantics — these HOLD today.
// ───────────────────────────────────────────────────────────────────────────
describe('order number uniqueness', () => {
  it('blocks a duplicate order number in the same branch once confirmed, even for a different staff member', async () => {
    await makeConfirmedOrder(`${TAG}-dup`, clerk.a1);
    const res = await requestUploads(`${TAG}-dup`, { clerkId: clerk.a2 }); // same brand+branch, different staff
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
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

  it('stores a SQL-injection-style order number verbatim (parameterised, no injection)', async () => {
    const evil = `${TAG}-'; DROP TABLE orders;--`;
    const res = await requestUploads(evil, { clerkId: clerk.a1 });
    expect(res.status).toBe(200);
    const row = await storedOrder(res.body.orderId);
    expect(row?.orderNumber).toBe(evil); // stored as data, tables intact
    const stillThere = await db.select().from(schema.orders).limit(1);
    expect(stillThere.length).toBeGreaterThanOrEqual(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Documentation: concrete effect of malformed numeric/text inputs.
// Always passes; prints what the server actually stored.
// ───────────────────────────────────────────────────────────────────────────
describe('[doc] what malformed staff input gets stored', () => {
  it('records how upload-urls handles hostile subtotal / notes / orderNumber', async () => {
    const neg = await requestUploads(`${TAG}-doc-neg`, { clerkId: clerk.a1, subtotal: -999999 });
    const nan = await requestUploads(`${TAG}-doc-nan`, { clerkId: clerk.a1, subtotal: 'NaN' });
    const inf = await requestUploads(`${TAG}-doc-inf`, { clerkId: clerk.a1, subtotal: 'Infinity' });
    const huge = await requestUploads(`${TAG}-doc-huge`, { clerkId: clerk.a1, subtotal: 1e13 });
    const str = await requestUploads(`${TAG}-doc-str`, { clerkId: clerk.a1, subtotal: 'abc' });
    const bigNotes = await requestUploads(`${TAG}-doc-notes`, { clerkId: clerk.a1, notes: 'A'.repeat(1_000_000) });
    const bigNum = await requestUploads('Z'.repeat(5000), { clerkId: clerk.a1 });

    const report = {
      negative: { status: neg.status, stored: neg.body?.orderId ? (await storedOrder(neg.body.orderId))?.subtotal : null },
      nan: { status: nan.status, stored: nan.body?.orderId ? (await storedOrder(nan.body.orderId))?.subtotal : null },
      infinity: { status: inf.status, stored: inf.body?.orderId ? (await storedOrder(inf.body.orderId))?.subtotal : null },
      huge_1e13: { status: huge.status, stored: huge.body?.orderId ? (await storedOrder(huge.body.orderId))?.subtotal : null },
      string_abc: { status: str.status, stored: str.body?.orderId ? (await storedOrder(str.body.orderId))?.subtotal : null },
      notes_1MB: { status: bigNotes.status, storedLen: bigNotes.body?.orderId ? (await storedOrder(bigNotes.body.orderId))?.notes?.length ?? 0 : 0 },
      orderNumber_5000: { status: bigNum.status, storedLen: bigNum.body?.orderId ? (await storedOrder(bigNum.body.orderId))?.orderNumber?.length ?? 0 : 0 },
    };
    // eslint-disable-next-line no-console
    console.log('[attack] malformed-input storage report:', JSON.stringify(report, null, 2));
    expect(report).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Input-validation gaps. These assert the SECURE behaviour and are marked
// it.fails: they pass TODAY because the validation is missing. Remove `.fails`
// when upload-urls starts validating, and each becomes a live guard.
// ───────────────────────────────────────────────────────────────────────────
describe('input validation gaps on upload-urls (secure expectations; it.fails = still vulnerable)', () => {
  // VULN: `subtotal` is written as `subtotal.toString()` with no numeric
  // validation, so a negative amount is accepted and later SUMmed into the
  // brand's finance totals (getOrdersSummary).
  it.fails('rejects a negative subtotal', async () => {
    const res = await requestUploads(`${TAG}-neg`, { clerkId: clerk.a1, subtotal: -999999 });
    expect(res.status).toBe(400);
  });

  // VULN: the string "NaN" (and "Infinity") are valid Postgres numeric values.
  // A confirmed order with subtotal NaN poisons SUM(subtotal) -> the finance
  // summary total for that currency becomes NaN/null for the whole brand.
  it.fails('rejects a non-finite subtotal ("NaN")', async () => {
    const res = await requestUploads(`${TAG}-nan`, { clerkId: clerk.a1, subtotal: 'NaN' });
    expect(res.status).toBe(400);
  });

  // VULN: a non-numeric subtotal throws at INSERT and is caught as a generic
  // 500 ("Failed to create order") instead of a 400. Clients cannot tell a bad
  // request from a server fault, and it logs a stack on attacker input.
  it.fails('answers 400 (not 500) for a non-numeric subtotal', async () => {
    const res = await requestUploads(`${TAG}-str`, { clerkId: clerk.a1, subtotal: 'abc' });
    expect(res.status).toBe(400);
  });

  // VULN: `notes` is unbounded text with no length cap. A single request can
  // store megabytes; req.json() has no size limit on this route.
  it.fails('caps or rejects an oversized notes field (1MB)', async () => {
    const res = await requestUploads(`${TAG}-notes`, { clerkId: clerk.a1, notes: 'A'.repeat(1_000_000) });
    expect(res.status).toBe(400);
  });

  // VULN: `orderNumber` is unbounded text with no length cap.
  it.fails('rejects an absurdly long order number (5000 chars)', async () => {
    const res = await requestUploads('Z'.repeat(5000), { clerkId: clerk.a1 });
    expect(res.status).toBe(400);
  });
});
