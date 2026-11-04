# Database

PostgreSQL 17 with Drizzle ORM (`drizzle-orm` and the `postgres` driver). Production target: Cloud SQL for
PostgreSQL 17 on Google Cloud, Dammam region (`me-central2`). Locally, the same engine and major version run in
Docker. The move to Google Cloud is in [GOOGLE_CLOUD.md](GOOGLE_CLOUD.md).

Last reviewed: 2026-11-04.

## Where things live

| What | Where |
| --- | --- |
| Schema (source of truth) | `src/lib/db/schema.ts` |
| Migrations (generated, committed) | `src/lib/db/migrations/` (baseline: `0000_init.sql`, then one file per change) |
| Runtime connection | `src/lib/db/index.ts` |
| drizzle-kit config | `drizzle.config.ts` (reads `MIGRATE_URL` from `.env.local`) |
| Local database | `docker-compose.yml` |
| Test data | `scripts/seed.ts` |
| Integration tests | `src/**/*.int.test.ts`, config in `vitest.integration.config.ts` |
| Allowed values (services, plans, statuses) | `src/config/services.ts`, `src/lib/applications/status.ts` |

## Tables

| Table | Holds |
| --- | --- |
| `applications` | Requests from the public site: service, plan, contact details, and the lifecycle `pending → quoted → paid → approved` (or `rejected`), with a timestamp for each step |
| `brands` | Customers, the root of every tenant: name, slug, plan, logo, colors, active flag, custom limits |
| `branches` | A brand's branches |
| `users` | Brand admins, finance and staff, linked to Clerk by `clerk_user_id` |
| `delivery_app_catalog` | Delivery apps the platform supports (HungerStation, Jahez, …) |
| `brand_delivery_apps` | The catalog apps each brand has turned on |
| `orders` | Orders that staff submit as proof, reviewed by finance (`needs_review → approved / rejected`) |
| `order_images` | The two photos of each order (`sealed`, `opened`): storage key and size |

Conventions:

- UUID primary keys from `gen_random_uuid()` (built in, no extension needed). `created_at` everywhere, and
  `updated_at` on every table whose rows change.
- Soft delete: brands, branches, users, orders and the catalog have `deleted_at`. Their indexes are partial
  (`WHERE deleted_at IS NULL`), so new queries should filter on it too.
- Allowed values are CHECK constraints generated from the TypeScript constants, not Postgres enums. To add a
  service, plan or status, change the constant and generate a migration.
- No row-level security. The app connects as one database user, and every query filters by the `brand_id` of the
  signed-in user. New queries must do the same.
- Application status changes use optimistic concurrency (`whereTransitionAllowed` in
  `src/lib/queries/applications.ts`): an update only applies while the row is still in a state that allows it.
- The master-admin role is read from Clerk (`publicMetadata.role`), so the admin console needs no `users` row.
- Files live in object storage, never in the database. `order_images.storage_path` is the object key
  (`<brandId>/<orderId>/sealed.jpg`) and `brands.logo_url` is a `/media/<key>` path. Neither changes when the
  bucket, region or provider changes.

### Orders

- The row is created when a phone asks for upload URLs, and counts as an order once confirm has found both photos
  in storage: confirm sets `confirmed_at` in the same transaction that adds the two `order_images` rows. Finance
  lists, counts, dashboards and branch details read confirmed orders only, through partial indexes
  (`WHERE deleted_at IS NULL AND confirmed_at IS NOT NULL`). New finance queries must filter the same way.
- One live order per brand, branch, delivery app and order number (`orders_live_number_unique`, partial on
  `deleted_at IS NULL`): two delivery apps can hand out the same number. Order numbers are stored normalized
  (`normalizeOrderNumber` in `src/lib/orders/input.ts`), so `١٢٣٤` and `1234` are the same order.
- CHECK constraints repeat the limits in `src/lib/orders/input.ts`: amount from 0 to 1,000,000, order number of 1 to
  40 characters, notes up to 500, a three-letter currency. They were added `NOT VALID`, so they hold for new and
  changed rows without checking older ones; `ALTER TABLE orders VALIDATE CONSTRAINT …` checks those too.

## Connection settings

| Variable | Used by | Local value |
| --- | --- | --- |
| `DATABASE_URL` | The app at runtime | The Docker URL from `.env.example` |
| `MIGRATE_URL` | drizzle-kit (`db:migrate`, `db:generate`, `db:studio`) | Same as `DATABASE_URL` |
| `DATABASE_SSL` | The app | `disable` |

The app requires TLS unless `DATABASE_SSL=disable`. Use `disable` only where the connection is already private or
encrypted: local Docker, the Cloud SQL Auth Proxy, or Cloud Run's built-in Cloud SQL socket.

Each server instance opens at most 3 connections (`statement_timeout` 10 s, connect timeout 30 s). On Cloud Run
the total is max instances × 3, which must stay below the Cloud SQL instance's `max_connections`.

## Local setup (any machine)

```bash
cp .env.example .env.local      # then fill in the keys (Clerk, Resend, …)
npm install
npm run db:up                   # PostgreSQL 17 on 127.0.0.1:54320 (Docker Desktop must be running)
npm run db:migrate              # create the tables
npm run db:seed                 # test data (refuses non-local databases)
npm run dev
```

Each PC has its own database. Only the migrations travel through git, so after `git pull` run `npm run db:migrate`
to catch up. Data stays in the `scamurai-pgdata` Docker volume across restarts. The host port is 54320, not 5432,
so it never clashes with another project's Postgres.

| Script | What it does |
| --- | --- |
| `npm run db:up` / `db:down` | Start / stop the container (data kept) |
| `npm run db:migrate` | Apply pending migrations to `MIGRATE_URL` |
| `npm run db:generate -- --name <change>` | Write a migration for schema changes |
| `npm run db:seed` | Insert test data (idempotent) |
| `npm run db:reset` | Wipe the volume, then migrate and seed again |
| `npm run db:studio` | Browse the data in Drizzle Studio |
| `npm run test:integration` | Tests against the local database (needs `db:up`, `db:migrate` and `db:seed`) |
| `npm run test:load` | Many staff uploading orders at once on one instance; prints latency percentiles |

SQL shell: `docker exec -it scamurai-postgres psql -U scamurai -d scamurai`

## Test data

`npm run db:seed` inserts:

- 6 delivery apps in the catalog.
- The demo brand "Demo Burger House" (slug `demo-burger`): 3 branches, 3 enabled apps, 5 users (owner, finance and
  3 staff) and 36 orders across all review states.
- 7 applications, covering every status.

It uses fixed UUIDs, so running it again never duplicates rows. The seeded users have `.test` emails and no Clerk
account: they exist for the data, not for signing in.

The seed and the integration tests refuse to run when `NODE_ENV=production`, when `DATABASE_URL` isn't localhost,
or when the database is Cloud SQL (`src/lib/db/localOnly.ts`). The Cloud SQL Auth Proxy also listens on localhost,
so they also check for the `cloudsqlsuperuser` role that every Cloud SQL instance has.

## Changing the schema

1. Run `git pull` first, so you build on the latest migrations.
2. Edit `src/lib/db/schema.ts`, and the constants in `src/config/` for new allowed values.
3. Run `npm run db:generate -- --name <change>`. drizzle-kit writes `src/lib/db/migrations/<NNNN>_<change>.sql` and
   updates `meta/`. If it asks whether a column was renamed or replaced, answer carefully: replacing drops the old
   column's data.
4. Read the SQL before applying it. Look for unexpected `DROP`s, and for `NOT NULL` columns added to tables that
   already have rows: those need a default or a backfill.
5. Run `npm run db:migrate`, then `npm run typecheck`, `npm test` and `npm run test:integration`.
6. Commit the schema change and the migration files together.

Rules:

- Never edit or delete a migration once it's pushed. Fix mistakes with a new migration.
- Migrate the database before deploying code that needs the change. Make changes additive first: add a column,
  deploy code that writes it, backfill, and drop the old column in a later release.
- drizzle-kit applies all pending migrations in one transaction, so `CREATE INDEX CONCURRENTLY` can't go in a
  migration file. On big tables, create such indexes by hand first.
- drizzle-kit only applies migrations newer than the newest applied one, going by the timestamps in
  `meta/_journal.json`. If two branches each generate a migration, the older one can be skipped without any error.
  After merging, delete one of them and generate it again.
- Don't use `drizzle-kit push` on shared or production databases: it changes the schema without migration files.
- Applied migrations are listed in the `drizzle.__drizzle_migrations` table.

## Backup and restore (local)

Dump inside the container and copy the file out, so the shell never touches the bytes (PowerShell's `>` corrupts
binary output). Keep dumps outside the repo.

```bash
docker exec scamurai-postgres pg_dump -U scamurai -d scamurai -Fc -f /tmp/scamurai.dump
docker cp scamurai-postgres:/tmp/scamurai.dump ../scamurai.dump
```

```bash
docker cp ../scamurai.dump scamurai-postgres:/tmp/scamurai.dump
docker exec scamurai-postgres pg_restore -U scamurai -d scamurai --clean --if-exists /tmp/scamurai.dump
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm run db:up` fails | Start Docker Desktop. |
| Port 54320 is already in use | Change the host port in `docker-compose.yml` and in both URLs in `.env.local`. |
| `password authentication failed` | The volume was created with other credentials. Run `npm run db:reset` (this wipes local data). |
| `relation "…" does not exist` | Run `npm run db:migrate`. |
| TLS errors, or the connection hangs, against the local database | Add `DATABASE_SSL=disable` to `.env.local` (local only). |
| The seed or the tests say `Refusing to run …` | Working as intended: test data only goes into the local database. |
| Every page fails with `JSON.parse … position 512` | `next build` ran while `next dev` was running. Stop dev, delete `.next/dev`, then start it again. |
