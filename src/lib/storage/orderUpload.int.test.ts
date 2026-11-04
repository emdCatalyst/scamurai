import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, like } from 'drizzle-orm';

/**
 * Staff order upload end to end, with the real route handlers, the real
 * local database and the local storage driver: signed upload URLs → PUT →
 * confirm → signed read URLs → GET. Only Clerk's session is mocked.
 */

const session = vi.hoisted(() => ({ current: { userId: '', role: 'staff', brandId: null as string | null } }));
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({
    userId: session.current.userId || null,
    sessionClaims: { metadata: { role: session.current.role, brandId: session.current.brandId } },
  }),
}));

const storageRoot = await mkdtemp(path.join(os.tmpdir(), 'scamurai-upload-'));
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = storageRoot;

const { db } = await import('@/lib/db');
const schema = await import('@/lib/db/schema');
const uploadUrls = await import('@/app/api/orders/upload-urls/route');
const confirm = await import('@/app/api/orders/[orderId]/confirm/route');
const signedUrls = await import('@/app/api/orders/[orderId]/signed-urls/route');
const localStorage = await import('@/app/api/storage/local/route');

const TAG = 'uploadtest';
const STAFF_CLERK_ID = `user_${TAG}_staff`;
const OTHER_STAFF_CLERK_ID = `user_${TAG}_staff2`;
const FINANCE_CLERK_ID = `user_${TAG}_finance`;
const JPEG = (marker: number) => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, marker, 0x10, 0x4a, 0x46]);

let brandId = '';
let branchId = '';
let deliveryAppId = '';

const asStaff = (clerkId = STAFF_CLERK_ID) => (session.current = { userId: clerkId, role: 'staff', brandId });
const asFinance = (brand = brandId) => (session.current = { userId: FINANCE_CLERK_ID, role: 'finance', brandId: brand });
const absolute = (url: string) => new URL(url, 'http://localhost:3000').toString();
const orderParams = (orderId: string) => ({ params: Promise.resolve({ orderId }) });

async function requestUploads(orderNumber: string, clientOrderId?: string, clerkId = STAFF_CLERK_ID) {
  asStaff(clerkId);
  const response = await uploadUrls.POST(
    new Request('http://localhost:3000/api/orders/upload-urls', {
      method: 'POST',
      body: JSON.stringify({ orderNumber, deliveryAppId, subtotal: 42.5, clientOrderId }),
    })
  );
  return { status: response.status, body: await response.json() };
}

async function put(target: { url: string; headers: Record<string, string> }, body: Uint8Array) {
  return localStorage.PUT(new Request(absolute(target.url), { method: 'PUT', headers: target.headers, body: Buffer.from(body) }));
}

async function cleanup() {
  await db.delete(schema.orders).where(like(schema.orders.orderNumber, `${TAG}-%`));
  await db.delete(schema.users).where(like(schema.users.email, `%.${TAG}@integration.test`));
}

beforeAll(async () => {
  await cleanup();
  // Uses the seeded demo brand (npm run db:seed).
  const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.slug, 'demo-burger'));
  if (!brand) throw new Error('Run npm run db:seed first (demo brand missing).');
  brandId = brand.id;
  const [branch] = await db.select().from(schema.branches).where(eq(schema.branches.brandId, brandId)).limit(1);
  const [app] = await db.select().from(schema.brandDeliveryApps).where(eq(schema.brandDeliveryApps.brandId, brandId)).limit(1);
  branchId = branch.id;
  deliveryAppId = app.id;
  await db.insert(schema.users).values([
    { email: `staff.${TAG}@integration.test`, fullName: 'Upload staff', role: 'staff', brandId, branchId, clerkUserId: STAFF_CLERK_ID },
    { email: `staff2.${TAG}@integration.test`, fullName: 'Other staff', role: 'staff', brandId, branchId, clerkUserId: OTHER_STAFF_CLERK_ID },
    { email: `finance.${TAG}@integration.test`, fullName: 'Upload finance', role: 'finance', brandId, clerkUserId: FINANCE_CLERK_ID },
  ]);
});

afterAll(async () => {
  await cleanup();
  await rm(storageRoot, { recursive: true, force: true });
});

describe('staff order upload (local storage driver)', () => {
  it('uploads both photos, confirms, and serves them back to finance only', async () => {
    const { status, body } = await requestUploads(`${TAG}-1`);
    expect(status).toBe(200);
    const { orderId, uploads } = body;
    expect(uploads.sealed).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } });

    // Confirming before the photos arrive is refused.
    asStaff();
    expect((await confirm.PATCH(new Request('http://localhost:3000'), orderParams(orderId))).status).toBe(422);

    expect((await put(uploads.sealed, JPEG(1))).status).toBe(200);
    expect((await put(uploads.opened, JPEG(2))).status).toBe(200);

    // Paths in the body are ignored: the server derives them from the order.
    const tampered = new Request('http://localhost:3000', {
      method: 'PATCH',
      body: JSON.stringify({ sealedStoragePath: 'someone-else/secret.jpg', openedStoragePath: '../../x.jpg' }),
    });
    expect((await confirm.PATCH(tampered, orderParams(orderId))).status).toBe(200);
    const images = await db.select().from(schema.orderImages).where(eq(schema.orderImages.orderId, orderId));
    expect(images.map((image) => image.storagePath).sort()).toEqual([
      `${brandId}/${orderId}/opened.jpg`,
      `${brandId}/${orderId}/sealed.jpg`,
    ]);

    // Retried confirm is idempotent.
    asStaff();
    expect(await (await confirm.PATCH(new Request('http://localhost:3000'), orderParams(orderId))).json()).toMatchObject({
      success: true,
      alreadyConfirmed: true,
    });

    // Finance of the same brand gets working read URLs.
    asFinance();
    const signed = await (await signedUrls.GET(new Request('http://localhost:3000'), orderParams(orderId))).json();
    const read = await localStorage.GET(new Request(absolute(signed.images.sealed.full)));
    expect(read.status).toBe(200);
    expect(read.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await read.arrayBuffer())).toEqual(JPEG(1));

    // Another brand's finance can't even see the order.
    asFinance('1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d');
    expect((await signedUrls.GET(new Request('http://localhost:3000'), orderParams(orderId))).status).toBe(404);
  });

  it('enforces the signed upload: content type, size and token', async () => {
    const { body } = await requestUploads(`${TAG}-2`);
    const { sealed } = body.uploads;

    expect((await put({ url: sealed.url, headers: { 'Content-Type': 'text/html' } }, JPEG(3))).status).toBe(400);
    expect((await put(sealed, new Uint8Array(6 * 1024 * 1024))).status).toBe(413);
    const forged = sealed.url.replace(/token=[^&]+/, 'token=forged.token');
    expect((await put({ url: forged, headers: sealed.headers }, JPEG(3))).status).toBe(403);
  });

  it('lets the same staff member resume an order whose photos never arrived', async () => {
    const first = await requestUploads(`${TAG}-3`);
    const retry = await requestUploads(`${TAG}-3`);
    expect(retry.status).toBe(200);
    expect(retry.body.orderId).toBe(first.body.orderId);

    // Once confirmed, the order number is taken for good.
    await put(retry.body.uploads.sealed, JPEG(4));
    await put(retry.body.uploads.opened, JPEG(5));
    asStaff();
    await confirm.PATCH(new Request('http://localhost:3000'), orderParams(retry.body.orderId));
    expect((await requestUploads(`${TAG}-3`)).status).toBe(400);
  });

  it("keeps a retried submission to one order, under the phone's own id", async () => {
    const clientOrderId = crypto.randomUUID();
    const first = await requestUploads(`${TAG}-4`, clientOrderId);
    expect(first.body.orderId).toBe(clientOrderId);

    // The photos never arrived: the outbox tries again later.
    const again = await requestUploads(`${TAG}-4`, clientOrderId);
    expect(again.body.orderId).toBe(clientOrderId);
    await put(again.body.uploads.sealed, JPEG(6));
    await put(again.body.uploads.opened, JPEG(7));
    asStaff();
    // The phone reports how long the order waited; the server logs it.
    const logged = vi.spyOn(console, 'info').mockImplementation(() => {});
    const report = JSON.stringify({ savedAt: Date.now() - 90_000, attempts: 2 });
    await confirm.PATCH(new Request('http://localhost:3000', { method: 'PATCH', body: report }), orderParams(clientOrderId));
    expect(logged).toHaveBeenCalledWith('[orders] confirmed', expect.stringMatching(/"attempts":2/));
    expect(JSON.parse(logged.mock.calls[0][1] as string).waitedSec).toBeGreaterThanOrEqual(90);
    logged.mockRestore();

    // The confirm answer was lost on the way back, so the phone retries once more.
    expect((await requestUploads(`${TAG}-4`, clientOrderId)).body).toMatchObject({ orderId: clientOrderId, alreadyConfirmed: true });
    expect(await db.select().from(schema.orders).where(eq(schema.orders.orderNumber, `${TAG}-4`))).toHaveLength(1);

    // Nobody else can claim that id.
    expect((await requestUploads(`${TAG}-5`, clientOrderId, OTHER_STAFF_CLERK_ID)).status).toBe(409);
  });
});
