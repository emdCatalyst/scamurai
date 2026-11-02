-- ════════════════════════════════════════════════════════════════════════════
-- 0001 · Multi-service applications — ROLLBACK
--
-- ⚠ Destructive: drops the columns added by the .up.sql file and the data in
--   them (service, contact name, branch count, payment reference, lifecycle
--   timestamps). Deploy the previous application code first.
--
-- Rows that cannot satisfy the old constraints are adjusted, not deleted:
--   • status 'paid' → 'quoted' (the old pipeline had no paid step)
--   • plan NULL (interest registrations) → 'starter'
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE applications SET status = 'quoted'  WHERE status = 'paid';
UPDATE applications SET plan   = 'starter' WHERE plan IS NULL;

DROP INDEX IF EXISTS idx_applications_service_status;
DROP INDEX IF EXISTS idx_applications_created_at;

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_service_values;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_locale_values;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_branch_count_range;

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_values;
ALTER TABLE applications ADD  CONSTRAINT applications_status_values
  CHECK (status IN ('pending', 'quoted', 'approved', 'rejected'));

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_plan_values;
ALTER TABLE applications ADD  CONSTRAINT applications_plan_values
  CHECK (plan IN ('starter', 'growth', 'enterprise'));
ALTER TABLE applications ALTER COLUMN plan SET NOT NULL;

ALTER TABLE applications
  DROP COLUMN IF EXISTS service,
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS branch_count,
  DROP COLUMN IF EXISTS locale,
  DROP COLUMN IF EXISTS payment_reference,
  DROP COLUMN IF EXISTS payment_confirmed_by,
  DROP COLUMN IF EXISTS quoted_at,
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS rejected_at;

COMMIT;
