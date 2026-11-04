# Moving to Google Cloud

The plan for running Scamurai on Google Cloud in the Dammam region (`me-central2`), fully managed, and the checklist
of what's left. Database details are in [DATABASE.md](DATABASE.md).

Status (2026-11-04): the code and the container image are ready for Cloud Run, Cloud SQL and Cloud Storage. Nothing
is deployed, and there is no Google Cloud project yet.

## Architecture

```text
Browser ──HTTPS──▶ External Application Load Balancer (custom domain, Google-managed certificate)
                          │ serverless NEG
                          ▼
                    Cloud Run service: the Next.js container (me-central2)
                          ├─▶ Cloud SQL for PostgreSQL 17 (me-central2), through Cloud Run's built-in socket
                          ├─▶ Cloud Storage: order images bucket (staff phones upload with signed URLs)
                          │                  brand assets bucket (logos, served by the app at /media)
                          ├─▶ Secret Manager (secrets as environment variables)
                          └─▶ Outside Google Cloud: Clerk (auth), Resend (email), Upstash (rate limiting)

Container images: Artifact Registry (me-central2). Builds: Cloud Build or GitHub Actions.
```

## Done in the code

- PostgreSQL 17 locally, the same major version as Cloud SQL. The baseline migration is committed, and nothing
  depends on Supabase any more (no RLS, no `supabase-js`).
- `src/lib/storage` has a Cloud Storage driver (`STORAGE_DRIVER=gcs`): V4 signed URLs, the size cap inside the
  signature, and object keys that the server derives itself.
- Logos are saved as `/media/<key>` paths, so moving buckets or regions doesn't touch the data.
- Marketing pages are static and don't read the database, so the build needs no database access.
- The image: `output: 'standalone'`, a multi-stage `Dockerfile` (Node 24, runs as a non-root user on port 8080),
  `.dockerignore`, and `cloudbuild.yaml` for Cloud Build. The build needs only the two `NEXT_PUBLIC_*` values.
- The admin console's stricter headers are set at runtime by `src/proxy.ts`, so the build never needs `ADMIN_SLUG`.
- The rate limiter reads the client IP from the right of `X-Forwarded-For`, where Google's load balancer puts it:
  it appends `<client-ip>,<load-balancer-ip>` to whatever the client sent. `TRUSTED_PROXY_HOPS` adjusts this.
- The seed and the integration tests refuse non-local hosts and Cloud SQL itself, so the Auth Proxy on localhost
  can't fool them.
- Content-Security-Policy on every page (`src/lib/security/csp.ts`, set by `src/proxy.ts`). Signed-in areas get a
  fresh nonce with `'strict-dynamic'`, so injected scripts and inline handlers can't run. Static public pages
  can't carry a nonce, so they allow inline scripts but still only load from listed origins (Clerk, Cloudflare
  Turnstile, Cloud Storage). Violations are logged as `[csp]` lines through `/api/csp-report`. `CSP_MODE`
  switches it: `enforce` (default), `report-only` or `off`.
- The staff order APIs read at most 4 KB, check every field with the rules the phones use
  (`src/lib/orders/input.ts`), and answer refusals with an error code (`src/lib/orders/errors.ts`) that tells the
  phone whether to try again. They and `/api/staff-telemetry` are limited per signed-in user, counted in each
  instance's memory (120 requests per 10 minutes), so the upload path makes no Redis call.
- Days are counted in Riyadh time in the code (finance date filters, dashboards, branch counts), so the server's
  zone, UTC on Cloud Run, doesn't matter.

## Still to do in the code

- [ ] **Photo retention.** Plans promise 90 days (Starter) or 365 days (Growth) of history (`historyDays` in
  `src/config/services.ts`), but nothing deletes old photos yet. Don't add a bucket lifecycle rule shorter than the
  longest plan. Deleting by plan needs a scheduled job. It should also remove what abandoned uploads leave behind:
  orders never confirmed (including the soft-deleted ones a colleague took over) and any photo of theirs that
  reached the bucket.

## Accounts, in order

1. A domain you own, and a Google account on it: Google Workspace, or the free Cloud Identity plus email forwarding
   (Cloud Identity has no mailbox).
2. A CNTXT account (cloud.cntxt.com). CNTXT is Google Cloud's reseller in Saudi Arabia, and Saudi-based customers who
   buy through it get the Dammam region. Billing and support go through CNTXT.
3. A billing account, a production project (ideally a separate staging project too), and a budget with alerts.
4. Production instances of Clerk and Resend on the product domain (both need DNS records).

## One-time setup

The commands use placeholders: `PROJECT_ID`, `YOUR_DOMAIN` and the bucket names. Run them in Git Bash or Cloud
Shell.

```bash
gcloud config set project PROJECT_ID
gcloud config set run/region me-central2

gcloud services enable run.googleapis.com sqladmin.googleapis.com storage.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com \
  iamcredentials.googleapis.com compute.googleapis.com
```

`iamcredentials` lets the app sign URLs without a key file, and `compute` is for the load balancer.

### Runtime service account

```bash
gcloud iam service-accounts create scamurai-run --display-name="Scamurai Cloud Run"
SA=scamurai-run@PROJECT_ID.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:$SA" --role=roles/cloudsql.client
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
# Lets it sign Cloud Storage URLs as itself:
gcloud iam service-accounts add-iam-policy-binding "$SA" --member="serviceAccount:$SA" --role=roles/iam.serviceAccountTokenCreator
```

Bucket roles are granted per bucket, below. Never create or download a key file for this account.

### Cloud SQL

```bash
gcloud sql instances create scamurai-db \
  --database-version=POSTGRES_17 --region=me-central2 \
  --edition=enterprise --tier=db-g1-small \
  --storage-type=SSD --storage-size=20GB --storage-auto-increase \
  --backup-start-time=23:00 --enable-point-in-time-recovery --retained-backups-count=14 \
  --deletion-protection

gcloud sql databases create scamurai --instance=scamurai-db
gcloud sql users set-password postgres --instance=scamurai-db --prompt-for-password
```

- Keep `--edition=enterprise`: new PostgreSQL 16+ instances default to Enterprise Plus, which costs more and has no
  small shared-core tiers.
- `db-g1-small` is shared-core with no SLA, which is fine at the start. As load grows, move to `db-custom-1-3840`
  (1 vCPU, 3.75 GB), then to high availability (`--availability-type=regional`).
- Backups start at 23:00 UTC (02:00 in Riyadh) and are kept for 14 days, with point-in-time recovery on top.
- Keep the public IP with no authorized networks. Then only Google's connectors (Cloud Run's socket, the Auth
  Proxy) can reach the instance, and they check IAM.
- Keep the `postgres` password in a password manager, never in the repo or in `.env.local`.

### Database user for the app (once)

Migrations run as `postgres` from your PC. The app gets its own user with data access only. Run this as `postgres`
in the `scamurai` database (Cloud SQL Studio in the console is enough):

```sql
CREATE ROLE scamurai_app LOGIN;
GRANT CONNECT ON DATABASE scamurai TO scamurai_app;
GRANT USAGE ON SCHEMA public TO scamurai_app;
-- Tables that migrations create later (as postgres) become usable by the app automatically:
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO scamurai_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO scamurai_app;
-- Tables that already exist:
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scamurai_app;
```

Then set its password from a prompt, so it never lands in a history file:

```bash
gcloud sql users set-password scamurai_app --instance=scamurai-db --prompt-for-password
```

If `set-password` refuses a role created in SQL, run `ALTER ROLE scamurai_app PASSWORD '…'` in Cloud SQL Studio
instead.

Create this user in SQL, not with `gcloud sql users create` or the console. Users created that way join
`cloudsqlsuperuser` and get far more rights than the app needs.

### Running migrations from your PC

Install the [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy), then:

```bash
gcloud auth application-default login
cloud-sql-proxy PROJECT_ID:me-central2:scamurai-db --port 54330
```

Leave it running and, in a second terminal (Git Bash):

```bash
MIGRATE_URL='postgresql://postgres:PASSWORD@127.0.0.1:54330/scamurai' npm run db:migrate
```

PowerShell:

```powershell
$env:MIGRATE_URL = 'postgresql://postgres:PASSWORD@127.0.0.1:54330/scamurai'
npm run db:migrate
Remove-Item Env:MIGRATE_URL
```

- A variable set in the terminal wins over `.env.local`. Never write the production URL into `.env.local`.
- Port 54330 keeps it apart from the local Docker database on 54320.
- URL-encode special characters in the password (`@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`).
- While the proxy runs, never run `db:seed`, `db:reset` or `test:integration` with a URL that points at it.
- Stop the proxy when you're done.

### Cloud Storage

Two private buckets in the same region. Bucket names are global across all of Google Cloud, so pick unique ones.

```bash
gcloud storage buckets create gs://ORDER_IMAGES_BUCKET --location=me-central2 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets create gs://BRAND_ASSETS_BUCKET --location=me-central2 --uniform-bucket-level-access --public-access-prevention

gcloud storage buckets update gs://ORDER_IMAGES_BUCKET --cors-file=cors.json

gcloud storage buckets add-iam-policy-binding gs://ORDER_IMAGES_BUCKET --member="serviceAccount:$SA" --role=roles/storage.objectAdmin
gcloud storage buckets add-iam-policy-binding gs://BRAND_ASSETS_BUCKET --member="serviceAccount:$SA" --role=roles/storage.objectAdmin
```

Staff phones upload straight to the order images bucket, so it needs CORS for the site's origin (`cors.json`):

```json
[
  {
    "origin": ["https://YOUR_DOMAIN"],
    "method": ["PUT"],
    "responseHeader": ["Content-Type", "x-goog-content-length-range"],
    "maxAgeSeconds": 3600
  }
]
```

Use separate buckets for staging, each with its own origin.

### Secrets

Create them in the console (Security → Secret Manager), so the values never pass through a shell history:

| Secret | Environment variable |
| --- | --- |
| `pg-password` | `PGPASSWORD` (the `scamurai_app` password) |
| `admin-slug` | `ADMIN_SLUG` |
| `clerk-secret-key` | `CLERK_SECRET_KEY` |
| `clerk-webhook-secret` | `CLERK_WEBHOOK_SECRET` |
| `resend-api-key` | `RESEND_API_KEY` |
| `upstash-redis-rest-token` | `UPSTASH_REDIS_REST_TOKEN` |

### Environment on Cloud Run

| Variable | Value | Set as |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql:///scamurai` (no host, see below) | env |
| `PGHOST` | `/cloudsql/PROJECT_ID:me-central2:scamurai-db` | env |
| `PGUSER` | `scamurai_app` | env |
| `PGPASSWORD` | | secret |
| `DATABASE_SSL` | `disable` (Cloud Run encrypts the socket connection itself) | env |
| `APP_URL` | `https://YOUR_DOMAIN` | env |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR_DOMAIN` | build arg |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | build arg |
| `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | | secret |
| `ADMIN_SLUG` | | secret |
| `RESEND_API_KEY` | | secret |
| `RESEND_FROM_ADDRESS` | `Scamurai <noreply@YOUR_DOMAIN>` | env |
| `SUPER_ADMIN_EMAIL` | Where new-application emails go | env |
| `UPSTASH_REDIS_REST_URL` | | env |
| `UPSTASH_REDIS_REST_TOKEN` | | secret |
| `TRUSTED_PROXY_HOPS` | Optional, default `1` (Google's external load balancer). Check the header once in staging | env |
| `CSP_MODE` | Optional: `report-only` on the first staging deploy, then remove it (default `enforce`). `off` is the emergency switch | env |
| `STORAGE_DRIVER` | `gcs` | env |
| `STORAGE_BUCKET_ORDER_IMAGES`, `STORAGE_BUCKET_BRAND_ASSETS` | The bucket names | env |

Leave these unset in production: `RESEND_DEV_FALLBACK_EMAIL` (it redirects every email to one address),
`MIGRATE_URL`, `STORAGE_LOCAL_DIR` and `STORAGE_SIGNING_SECRET`. `NODE_ENV=production` comes from the image.

Why `DATABASE_URL` has no host: postgres.js (3.4.9, tested) uses a Unix socket when the host contains `/`, but it
reads such a host only from `PGHOST` or the `host` option. A URL like `user:pass@/scamurai` is invalid, and a
`?host=` parameter is sent to the server as a setting, so the connection fails.

### Build and deploy

```bash
gcloud artifacts repositories create scamurai --repository-format=docker --location=me-central2

# Build and push the image (cloudbuild.yaml passes the NEXT_PUBLIC_* build args):
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_SITE_URL=https://YOUR_DOMAIN,_CLERK_PUBLISHABLE_KEY=pk_live_xxx,_TAG=$(git rev-parse --short HEAD)

gcloud run deploy scamurai-web \
  --image=me-central2-docker.pkg.dev/PROJECT_ID/scamurai/web:TAG \
  --region=me-central2 \
  --service-account="$SA" \
  --add-cloudsql-instances=PROJECT_ID:me-central2:scamurai-db \
  --env-vars-file=cloudrun.env.yaml \
  --set-secrets=PGPASSWORD=pg-password:latest,ADMIN_SLUG=admin-slug:latest,CLERK_SECRET_KEY=clerk-secret-key:latest,CLERK_WEBHOOK_SECRET=clerk-webhook-secret:latest,RESEND_API_KEY=resend-api-key:latest,UPSTASH_REDIS_REST_TOKEN=upstash-redis-rest-token:latest \
  --min-instances=1 --max-instances=4 --cpu=1 --memory=1Gi \
  --ingress=internal-and-cloud-load-balancing \
  --allow-unauthenticated
```

- `cloudrun.env.yaml` holds the plain variables from the table above (no secrets), one `KEY: "value"` per line.
- The image listens on 8080 (Cloud Run's default `PORT`) and runs as a non-root user.
- To try the image on your PC first, build it with `NEXT_PUBLIC_SITE_URL=http://localhost:3200` and the test
  publishable key, then run it on the local database's network:
  `docker run --rm -p 127.0.0.1:3200:8080 --network scamurai_default --env-file <file> scamurai-web`, where the
  env file has the runtime variables and
  `DATABASE_URL=postgresql://scamurai:scamurai_local@scamurai-postgres:5432/scamurai`. Keep that env file outside
  the repo.
- `--min-instances=1` avoids cold starts; one instance is always billed.
- `--max-instances=4` × 6 connections (two pools of 3, see [DATABASE.md](DATABASE.md)) = 24 database connections,
  well inside the small tier's limit.
- `--ingress=internal-and-cloud-load-balancing` closes the public `run.app` URL, so all traffic comes through the
  load balancer, with its `X-Forwarded-For` format.
- `--allow-unauthenticated` is needed because the site is public: the load balancer calls the service anonymously.
- Rollback: `gcloud run services update-traffic scamurai-web --to-revisions=REVISION_NAME=100`.

### Domain and HTTPS

Cloud Run's own domain mapping is a Preview feature that isn't offered in `me-central2`. Put an external Application
Load Balancer in front, with a serverless NEG pointing at the service and a Google-managed certificate:

- **Global** external load balancer: Google's usual recommendation. TLS ends at Google's edge closest to the
  visitor, and Cloud CDN and Cloud Armor are available.
- **Regional** external load balancer in `me-central2`: traffic and TLS stay in the region. It needs a proxy-only
  subnet and a regional certificate. Prefer it if data-residency rules require processing inside the Kingdom.

Then point the domain's DNS at the load balancer's IP and wait until the certificate is `ACTIVE`. Guides:
[global](https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless),
[regional](https://docs.cloud.google.com/load-balancing/docs/https/setting-up-reg-ext-https-serverless),
[domain mapping limits](https://docs.cloud.google.com/run/docs/mapping-custom-domains).

## Third-party services

**Clerk** (production instance):

1. Create the production instance on the product domain and add the DNS records Clerk lists.
2. Sessions → Customize session token:
   `{"metadata": "{{user.public_metadata}}", "email": "{{user.primary_email_address}}", "image": "{{user.image_url}}"}`.
   Without it, every request calls Clerk's API.
3. Webhooks: endpoint `https://YOUR_DOMAIN/api/webhooks/clerk`, event `user.created`. Put the signing secret in
   `CLERK_WEBHOOK_SECRET`.
4. First master admin: create the user in the production instance and set its public metadata to
   `{"role": "master_admin"}`. Production users are separate from development users.

**Resend:** verify the domain (SPF and DKIM records, plus a DMARC record) and set `RESEND_FROM_ADDRESS`.

**Upstash:** create a Redis database and set the two `UPSTASH_REDIS_REST_*` variables. The limiter only runs in
production, and it fails open: if Redis can't be reached, applications still go through.

## Data residency

In the Dammam region: the app, the database, order photos and logos. Outside Google Cloud: Clerk (user accounts and
emails), Resend (email contents) and Upstash (visitor IPs, as rate-limit keys). Check this list against PDPL
obligations before launch.

## After the first deploy

- [ ] `/en` and `/ar` load on the domain, and `sitemap.xml` and `robots.txt` show the production domain.
- [ ] An application sent from the public form shows up in the admin console, and the notification email arrives.
- [ ] Approving an application sends the invitation. After the customer signs up, the webhook links the brand admin
  (`users.clerk_user_id` is set).
- [ ] Staff upload: both photos reach the bucket without a CORS error, confirm succeeds, and finance sees the photos.
- [ ] A logo upload works and `/media/…` serves it.
- [ ] A 4th application from the same IP within 24 hours is refused. If not, log `X-Forwarded-For` once and set
  `TRUSTED_PROXY_HOPS`.
- [ ] With `CSP_MODE=report-only` on staging, click through sign-in, a staff upload and the finance photo view, then
  check the logs for `[csp]` lines. With none left, remove `CSP_MODE` so the policy is enforced.
- [ ] Cloud SQL has backups, point-in-time recovery and deletion protection on.
- [ ] Budget alerts are set.
- [ ] The uptime check on `/api/health` and the alerts in "Monitoring and alerts" are set.

## Monitoring and alerts

Set these up in Cloud Monitoring once the service runs. The app's log lines are a `[prefix]` followed by JSON, so
log-based metrics can pull fields out with `REGEXP_EXTRACT`.

| Signal | Source | Alert when |
| --- | --- | --- |
| The app and the database answer | Uptime check on `https://YOUR_DOMAIN/api/health` (200, or 503 when the database doesn't reply within 2 s) | 2 failures in a row |
| Orders stuck on phones | `[telemetry]` lines with `"type":"outbox"`: sent when an order waited 10+ minutes on a phone (at most every 5 minutes), once per refused order, and when a worker signs out leaving orders behind. `otherAccounts` counts orders other workers left on that phone | any |
| Upload delay | `waitedSec` in `[orders] confirmed` lines: seconds from saving on the phone to confirmed | p95 above 10 minutes |
| Abandoned uploads | `[orders] taken over` lines: a colleague resubmitted a number whose upload no phone had tried for 2 hours | more than a few a day |
| Page speed on staff phones | `[telemetry]` lines with `"type":"vitals"` (LCP, INP, CLS, FCP, TTFB) | INP p75 above 500 ms |
| Content the browser blocked | `[csp]` lines, at most 60 a minute per instance (more are dropped, so a steady 60 means a flood or a policy problem) | any new kind |
| Server errors | Cloud Run 5xx, and `Error` log lines | above 1% of requests |

## Operations

- **Load test (local):** `npm run test:load`, tuned with `ORDERS` and `CONCURRENCY`. On one instance with the 3
  connections of its staff upload pool (local Docker database, 2026-11-04) it handled about 160 orders per second at
  any concurrency, with no errors. A whole order took 33 ms with 5 at once, 0.3 s with 50 and 1.3 s with 200 (waiting
  for the pool). A busy branch sends a few orders a minute, so the server has a wide margin. Clerk, Cloud Storage
  signing and HTTP aren't included: before launch, run a smaller HTTP test against staging.

- **Before a risky migration:** `gcloud sql backups create --instance=scamurai-db`.
- **Test a restore** now and then: `gcloud sql instances clone scamurai-db scamurai-db-restore-test
  --point-in-time=2026-01-01T10:00:00Z` (a UTC time inside the recovery window). Check the data, then delete the
  clone.
- **Rolling back code:** send traffic back to an earlier revision (see Build and deploy). Migrations only go forward,
  so undo a schema change with a new migration.
- **Logs:** Cloud Logging. Server messages carry prefixes such as `[Auth]`, `[ratelimit]` and `[webhook]`.
