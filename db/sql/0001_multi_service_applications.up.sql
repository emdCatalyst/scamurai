-- ════════════════════════════════════════════════════════════════════════════
-- 0001 · Multi-service applications
--
-- Turns `applications` from "Dispute Orders sign-ups" into a multi-service
-- pipeline: pending → quoted → paid → approved (or rejected).
--
-- • Additive and backward compatible: existing rows become Dispute Orders
--   applications, and the previous application code keeps working against
--   the new shape. Apply this BEFORE deploying the code that uses it.
-- • Idempotent: safe to run more than once.
-- • Mirrors src/lib/db/schema.ts (applications table).
--
-- Run in the Supabase SQL editor, or: psql "$MIGRATE_URL" -f <this file>
-- Rollback: 0001_multi_service_applications.down.sql
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. New columns ─────────────────────────────────────────────────────────────
ALTER TABLE applications ADD COLUMN IF NOT EXISTS service              text        NOT NULL DEFAULT 'dispute_orders';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS contact_name         text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS branch_count         integer;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS locale               text        NOT NULL DEFAULT 'en';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_reference    text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_confirmed_by text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS quoted_at            timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS paid_at              timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS approved_at          timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejected_at          timestamptz;

-- 2. Interest registrations (coming-soon services) have no plan ──────────────
ALTER TABLE applications ALTER COLUMN plan DROP NOT NULL;

-- 3. Constraints ──────────────────────────────────────────────────────────────
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_values;
ALTER TABLE applications ADD  CONSTRAINT applications_status_values
  CHECK (status IN ('pending', 'quoted', 'paid', 'approved', 'rejected'));

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_plan_values;
ALTER TABLE applications ADD  CONSTRAINT applications_plan_values
  CHECK (plan IS NULL OR plan IN ('starter', 'growth', 'enterprise'));

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_service_values;
ALTER TABLE applications ADD  CONSTRAINT applications_service_values
  CHECK (service IN ('dispute_orders', 'compliance', 'receiving'));

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_locale_values;
ALTER TABLE applications ADD  CONSTRAINT applications_locale_values
  CHECK (locale IN ('en', 'ar'));

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_branch_count_range;
ALTER TABLE applications ADD  CONSTRAINT applications_branch_count_range
  CHECK (branch_count IS NULL OR branch_count BETWEEN 1 AND 10000);

-- 4. Indexes for the admin list (filter by service/status, newest first) ─────
CREATE INDEX IF NOT EXISTS idx_applications_service_status ON applications (service, status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at     ON applications (created_at DESC);

-- 5. Backfill lifecycle timestamps for rows decided before this migration.
--    updated_at is the best available record of when the last decision
--    happened. paid_at stays NULL — payment was not tracked before.
UPDATE applications SET quoted_at   = updated_at WHERE status = 'quoted'   AND quoted_at   IS NULL;
UPDATE applications SET approved_at = updated_at WHERE status = 'approved' AND approved_at IS NULL;
UPDATE applications SET rejected_at = updated_at WHERE status = 'rejected' AND rejected_at IS NULL;

COMMIT;
