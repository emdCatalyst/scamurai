-- 0002 · Enable row-level security — ROLLBACK
-- Re-opens the tables to Supabase's Data API. Only do this if you add
-- explicit policies instead.

BEGIN;

ALTER TABLE applications         DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches             DISABLE ROW LEVEL SECURITY;
ALTER TABLE brand_delivery_apps  DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands               DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_app_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_images         DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders               DISABLE ROW LEVEL SECURITY;
ALTER TABLE users                DISABLE ROW LEVEL SECURITY;

COMMIT;
