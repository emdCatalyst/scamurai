# Database

PostgreSQL, accessed with Drizzle ORM. The schema lives in `src/lib/db/schema.ts`; migrations are generated
from it into `src/lib/db/migrations/` and committed. Production target: Cloud SQL for PostgreSQL 17 on
Google Cloud (Dammam region). Locally, the same engine and version run in Docker.

## Local setup (any machine)

```bash
cp .env.example .env.local      # then fill in the keys (Clerk, Resend, …)
npm install
npm run db:up                   # PostgreSQL 17 on 127.0.0.1:54320 (Docker Desktop must be running)
npm run db:migrate              # create tables
npm run db:seed                 # realistic test data (refuses to run against non-local databases)
npm run dev
```

Data persists in the `scamurai-pgdata` Docker volume across restarts.

| Script | What it does |
| --- | --- |
| `npm run db:up` / `db:down` | Start / stop the container (data kept) |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Insert test data (idempotent) |
| `npm run db:reset` | Wipe the volume, then migrate and seed again |
| `npm run db:studio` | Browse the data in Drizzle Studio |

## Changing the schema

Edit `src/lib/db/schema.ts`, then `npm run db:generate -- --name <change>`. Review the SQL and commit it.
Run `npm run db:migrate` before deploying code that depends on it. Never edit a migration that has already
been applied anywhere; add a new one instead.

## Cloud SQL (production)

1. Create the instance in the Dammam region with the same major version (17).
2. Create a database and an application user; connect through the Cloud SQL Auth Proxy or connector (then
   `DATABASE_SSL=disable` is fine, because the proxy encrypts the hop) or over TLS.
3. Point `MIGRATE_URL` at it and run `npm run db:migrate`. Do not run `db:seed` there.
