/**
 * Realistic test data for local development: delivery apps, a demo brand with
 * branches, team members and a month of orders, plus applications in every
 * status for every service.
 *
 *   npm run db:seed
 *
 * Safe to run repeatedly: every row has a fixed id (or natural key) and
 * existing rows are left untouched. Refuses to run against anything but a
 * local database, so it can never write test data to production.
 *
 * Seeded team members have no Clerk account, so they can't sign in. To test
 * logins, go through the real flow: apply → approve in the admin → accept the
 * invitation → add staff from the brand portal.
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { assertLocalDatabaseUrl, assertNotCloudSql } from '../src/lib/db/localOnly';
import * as schema from '../src/lib/db/schema';

config({ path: '.env.local', quiet: true });

/** Deterministic ids, so re-running the seed never duplicates rows. */
const id = (group: number, n: number) =>
  `00000000-0000-4000-8000-${String(group).padStart(4, '0')}${String(n).padStart(8, '0')}`;

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number, hour = 13) => {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, (days * 7) % 60, 0, 0);
  return date;
};

const DELIVERY_APPS = ['HungerStation', 'Jahez', 'Keeta', 'ToYou', 'Mrsool', 'The Chefz'];

const BRAND_ID = id(1, 1);
const BRANCHES = [
  { id: id(2, 1), name: 'الرياض - العليا' },
  { id: id(2, 2), name: 'جدة - التحلية' },
  { id: id(2, 3), name: 'الدمام - الشاطئ' },
];
const ENABLED_APPS = ['HungerStation', 'Jahez', 'Keeta'];

const TEAM = [
  { id: id(3, 1), email: 'owner@demo-burger.test', fullName: 'Owner (demo)', role: 'brand_admin', branchId: null },
  { id: id(3, 2), email: 'finance@demo-burger.test', fullName: 'Finance (demo)', role: 'finance', branchId: null },
  { id: id(3, 3), email: 'staff.olaya@demo-burger.test', fullName: 'Staff Olaya (demo)', role: 'staff', branchId: BRANCHES[0].id },
  { id: id(3, 4), email: 'staff.tahlia@demo-burger.test', fullName: 'Staff Tahlia (demo)', role: 'staff', branchId: BRANCHES[1].id },
  { id: id(3, 5), email: 'staff.shatea@demo-burger.test', fullName: 'Staff Shatea (demo)', role: 'staff', branchId: BRANCHES[2].id },
] as const;

const ORDER_COUNT = 36;

async function main() {
  const client = postgres(assertLocalDatabaseUrl(process.env.DATABASE_URL, 'the seed'), { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });

  try {
    await assertNotCloudSql(client, 'the seed');
    await db.transaction(async (tx) => {
      // Delivery app catalog (natural key: name).
      await tx
        .insert(schema.deliveryAppCatalog)
        .values(DELIVERY_APPS.map((name) => ({ name })))
        .onConflictDoNothing({ target: schema.deliveryAppCatalog.name });
      const catalog = await tx.select({ id: schema.deliveryAppCatalog.id, name: schema.deliveryAppCatalog.name }).from(schema.deliveryAppCatalog);
      const catalogId = (name: string) => catalog.find((app) => app.name === name)!.id;

      // Demo brand, as if its application had been approved.
      await tx
        .insert(schema.brands)
        .values({
          id: BRAND_ID,
          name: 'Demo Burger House',
          slug: 'demo-burger',
          plan: 'growth',
          brandColors: { primary: '#e4572e', background: '#1f1b2e', surface: '#ffffff', textAccent: '#ffb627' },
        })
        .onConflictDoNothing();

      await tx
        .insert(schema.branches)
        .values(BRANCHES.map((branch) => ({ ...branch, brandId: BRAND_ID })))
        .onConflictDoNothing();

      await tx
        .insert(schema.brandDeliveryApps)
        .values(ENABLED_APPS.map((name, index) => ({ id: id(4, index + 1), brandId: BRAND_ID, catalogAppId: catalogId(name) })))
        .onConflictDoNothing();

      await tx
        .insert(schema.users)
        .values(
          TEAM.map((member) => ({
            ...member,
            brandId: BRAND_ID,
            isActive: true,
            onboardingComplete: true,
            joinedAt: daysAgo(40),
          }))
        )
        .onConflictDoNothing();

      // A month of orders across branches, apps and review states.
      const staff = TEAM.filter((member) => member.role === 'staff');
      const finance = TEAM.find((member) => member.role === 'finance')!;
      await tx
        .insert(schema.orders)
        .values(
          Array.from({ length: ORDER_COUNT }, (_, i) => {
            const submitter = staff[i % staff.length];
            const status = i % 9 === 0 ? 'rejected' : i % 3 === 0 ? 'needs_review' : 'approved';
            const submittedAt = daysAgo(Math.floor((i * 29) / ORDER_COUNT), 11 + (i % 10));
            return {
              id: id(5, i + 1),
              brandId: BRAND_ID,
              orderNumber: `ORD-${String(1001 + i)}`,
              branchId: submitter.branchId!,
              deliveryAppId: id(4, (i % ENABLED_APPS.length) + 1),
              submittedBy: submitter.id,
              subtotal: (35 + ((i * 37) % 160) + 0.5).toFixed(2),
              status,
              reviewedBy: status === 'needs_review' ? null : finance.id,
              reviewedAt: status === 'needs_review' ? null : new Date(submittedAt.getTime() + 2 * 60 * 60 * 1000),
              rejectionReason: status === 'rejected' ? 'Seal not visible in the sealed photo' : null,
              submittedAt,
              createdAt: submittedAt,
              updatedAt: submittedAt,
            };
          })
        )
        .onConflictDoNothing();

      // Applications: every status, every service, interest registrations included.
      await tx
        .insert(schema.applications)
        .values([
          {
            id: id(6, 1), service: 'dispute_orders', plan: 'growth', status: 'pending', locale: 'ar',
            brandName: 'Najd Grill House', contactName: 'سارة', contactEmail: 'sara@najd-grill.test',
            phone: '+966 50 000 0001', branchCount: 6, createdAt: daysAgo(1), updatedAt: daysAgo(1),
          },
          {
            id: id(6, 2), service: 'dispute_orders', plan: 'starter', status: 'quoted', locale: 'en',
            brandName: 'Red Sea Cafe', contactName: 'Omar', contactEmail: 'omar@redsea-cafe.test',
            branchCount: 2, quotedAt: daysAgo(3), createdAt: daysAgo(5), updatedAt: daysAgo(3),
          },
          {
            id: id(6, 3), service: 'dispute_orders', plan: 'enterprise', status: 'paid', locale: 'ar',
            brandName: 'Falcon Kitchens', contactName: 'فهد', contactEmail: 'fahad@falcon-kitchens.test',
            phone: '+966 55 000 0003', branchCount: 40, quotedAt: daysAgo(8), paidAt: daysAgo(2),
            paymentReference: 'TRX-2026-0001', createdAt: daysAgo(10), updatedAt: daysAgo(2),
          },
          {
            id: id(6, 4), service: 'dispute_orders', plan: 'growth', status: 'approved', locale: 'en',
            brandName: 'Demo Burger House', contactName: 'Owner (demo)', contactEmail: 'owner@demo-burger.test',
            branchCount: 3, brandId: BRAND_ID, quotedAt: daysAgo(45), paidAt: daysAgo(43), approvedAt: daysAgo(42),
            paymentReference: 'TRX-2026-0000', createdAt: daysAgo(48), updatedAt: daysAgo(42),
          },
          {
            id: id(6, 5), service: 'dispute_orders', plan: 'starter', status: 'rejected', locale: 'ar',
            brandName: 'Desert Bakery', contactName: 'نورة', contactEmail: 'noura@desert-bakery.test',
            branchCount: 1, rejectionNote: 'Single branch outside our current coverage', rejectedAt: daysAgo(6),
            createdAt: daysAgo(7), updatedAt: daysAgo(6),
          },
          {
            id: id(6, 6), service: 'compliance', plan: null, status: 'pending', locale: 'ar',
            brandName: 'Oasis Market', contactName: 'خالد', contactEmail: 'khalid@oasis-market.test',
            phone: '+966 54 000 0006', branchCount: 12, createdAt: daysAgo(2), updatedAt: daysAgo(2),
          },
          {
            id: id(6, 7), service: 'receiving', plan: null, status: 'pending', locale: 'en',
            brandName: 'Palm Central Kitchen', contactName: 'Lina', contactEmail: 'lina@palm-kitchen.test',
            branchCount: 5, createdAt: daysAgo(4), updatedAt: daysAgo(4),
          },
        ])
        .onConflictDoNothing();
    });

    const counts = await client`
      select
        (select count(*) from delivery_app_catalog)::int as delivery_apps,
        (select count(*) from brands)::int as brands,
        (select count(*) from branches)::int as branches,
        (select count(*) from users)::int as users,
        (select count(*) from orders)::int as orders,
        (select count(*) from applications)::int as applications`;
    console.log('Seeded local database:', counts[0]);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
