import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, like } from 'drizzle-orm';

/**
 * Load test of the staff upload path on ONE server instance (its database
 * pool of 3): many staff submit orders at once through the real route
 * handlers, the local database and the local storage driver. Only sign-in is
 * mocked, per simulated request.
 *
 *   npm run test:load
 *   ORDERS=600 CONCURRENCY=100 npm run test:load
 *
 * Not measured: HTTP and Next.js overhead, Clerk, and Cloud Storage URL
 * signing (an IAM call per photo in production).
 */

type Session = { userId: string; role: 'staff'; brandId: string };
type Holder = { __loadSession?: AsyncLocalStorage<Session> };
const sessions = new AsyncLocalStorage<Session>();
(globalThis as Holder).__loadSession = sessions;
vi.mock('@/lib/auth', () => ({ requireAuth: async () => (globalThis as Holder).__loadSession!.getStore() }));

const storageRoot = await mkdtemp(path.join(os.tmpdir(), 'scamurai-load-'));
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = storageRoot;

const { db } = await import('@/lib/db');
const schema = await import('@/lib/db/schema');
const uploadUrls = await import('@/app/api/orders/upload-urls/route');
const confirm = await import('@/app/api/orders/[orderId]/confirm/route');
const localStorageRoute = await import('@/app/api/storage/local/route');

const ORDERS = Number(process.env.ORDERS ?? 300);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 50);
const STAFF = 30;
const TAG = 'loadtest';
/** About the size of a photo after the phone shrinks it. */
const PHOTO = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(150 * 1024, 7)]);
const ORIGIN = 'http://localhost:3000';

let brandId = '';
let deliveryAppId = '';
const staff: Session[] = [];

type Timing = { urls: number; photos: number; confirm: number; total: number };

async function submitOrder(i: number): Promise<Timing> {
  return sessions.run(staff[i % STAFF], async () => {
    const t0 = performance.now();
    const res = await uploadUrls.POST(
      new Request(`${ORIGIN}/api/orders/upload-urls`, {
        method: 'POST',
        body: JSON.stringify({ orderNumber: `${TAG}-${i}`, deliveryAppId, subtotal: 50, clientOrderId: crypto.randomUUID() }),
      })
    );
    if (res.status !== 200) throw new Error(`upload-urls ${res.status}`);
    const { orderId, uploads } = await res.json();
    const t1 = performance.now();

    await Promise.all(
      (['sealed', 'opened'] as const).map(async (type) => {
        const target = uploads[type];
        const put = await localStorageRoute.PUT(
          new Request(new URL(target.url, ORIGIN), { method: 'PUT', headers: target.headers, body: PHOTO })
        );
        if (put.status !== 200) throw new Error(`photo ${type} ${put.status}`);
      })
    );
    const t2 = performance.now();

    const done = await confirm.PATCH(
      new Request(ORIGIN, { method: 'PATCH', body: JSON.stringify({ savedAt: Date.now(), attempts: 0 }) }),
      { params: Promise.resolve({ orderId }) }
    );
    if (done.status !== 200) throw new Error(`confirm ${done.status}`);
    const t3 = performance.now();
    return { urls: t1 - t0, photos: t2 - t1, confirm: t3 - t2, total: t3 - t0 };
  });
}

/** Runs `count` tasks, `concurrency` at a time. */
async function runPool<T>(count: number, concurrency: number, task: (i: number) => Promise<T>) {
  const results: T[] = [];
  const errors: string[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < count) {
        const i = next++;
        try {
          results.push(await task(i));
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    })
  );
  return { results, errors };
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]);
};

async function cleanup() {
  await db.delete(schema.orders).where(like(schema.orders.orderNumber, `${TAG}-%`));
  await db.delete(schema.users).where(like(schema.users.email, `%.${TAG}@load.test`));
}

beforeAll(async () => {
  await cleanup();
  const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.slug, 'demo-burger'));
  if (!brand) throw new Error('Run npm run db:seed first (demo brand missing).');
  brandId = brand.id;
  const branches = await db.select().from(schema.branches).where(eq(schema.branches.brandId, brandId));
  const [app] = await db.select().from(schema.brandDeliveryApps).where(eq(schema.brandDeliveryApps.brandId, brandId)).limit(1);
  deliveryAppId = app.id;
  for (let i = 0; i < STAFF; i++) staff.push({ userId: `user_${TAG}_${i}`, role: 'staff', brandId });
  await db.insert(schema.users).values(
    staff.map((s, i) => ({
      email: `staff${i}.${TAG}@load.test`,
      fullName: `Load staff ${i}`,
      role: 'staff' as const,
      brandId,
      branchId: branches[i % branches.length].id,
      clerkUserId: s.userId,
    }))
  );
});

afterAll(async () => {
  await cleanup();
  await rm(storageRoot, { recursive: true, force: true });
});

describe('staff order uploads under load (one instance)', () => {
  it(`handles ${ORDERS} orders, ${CONCURRENCY} at a time`, async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {}); // one `[orders] confirmed` line per order
    const started = performance.now();
    const { results, errors } = await runPool(ORDERS, CONCURRENCY, submitOrder);
    const seconds = (performance.now() - started) / 1000;

    const row = (key: keyof Timing) => ({
      p50: percentile(results.map((r) => r[key]), 50),
      p95: percentile(results.map((r) => r[key]), 95),
      max: percentile(results.map((r) => r[key]), 100),
    });
    console.log(`\n${results.length} orders in ${seconds.toFixed(1)} s = ${(results.length / seconds).toFixed(1)} orders/s, ${errors.length} errors`);
    console.table({ 'upload-urls (ms)': row('urls'), 'photos (ms)': row('photos'), 'confirm (ms)': row('confirm'), 'whole order (ms)': row('total') });
    if (errors.length) console.log('first errors:', errors.slice(0, 3));

    expect(errors).toEqual([]);
    expect(await db.$count(schema.orders, like(schema.orders.orderNumber, `${TAG}-%`))).toBe(ORDERS);
  });
});
