-- ════════════════════════════════════════════════════════════════════════════
-- 0002 · Enable row-level security (legacy databases only)
--
-- New databases get RLS from src/lib/db/migrations/0000_init.sql. Databases
-- created before that baseline need this file after 0001.
--
-- RLS with no policies denies all access through Supabase's Data API
-- (anon/authenticated keys). The app connects as the table owner, which
-- bypasses RLS, so server code is unaffected.
--
-- Idempotent: enabling RLS twice is a no-op.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE applications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_delivery_apps  ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands               ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_app_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;

COMMIT;
