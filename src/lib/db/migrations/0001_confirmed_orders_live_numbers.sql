-- An order counts once both photos arrived. Until now every finance query
-- counted order_images per order; confirm now sets confirmed_at instead.
ALTER TABLE "orders" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "orders" SET "confirmed_at" = "submitted_at" WHERE (SELECT count(*) FROM "order_images" WHERE "order_images"."order_id" = "orders"."id") >= 2;--> statement-breakpoint
-- One live order per brand, branch, delivery app and number. The old key
-- (brand, number, branch) held for every row, so no existing row can break this finer one.
CREATE UNIQUE INDEX "orders_live_number_unique" ON "orders" USING btree ("brand_id","branch_id","delivery_app_id","order_number") WHERE "orders"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_brand_id_order_number_branch_id_unique";--> statement-breakpoint
DROP INDEX "idx_orders_brand";--> statement-breakpoint
DROP INDEX "idx_orders_branch";--> statement-breakpoint
DROP INDEX "idx_orders_submitted_at";--> statement-breakpoint
CREATE INDEX "idx_orders_brand" ON "orders" USING btree ("brand_id","status") WHERE "orders"."deleted_at" IS NULL AND "orders"."confirmed_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_branch" ON "orders" USING btree ("brand_id","branch_id","submitted_at" DESC) WHERE "orders"."deleted_at" IS NULL AND "orders"."confirmed_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_submitted_at" ON "orders" USING btree ("brand_id","submitted_at" DESC) WHERE "orders"."deleted_at" IS NULL AND "orders"."confirmed_at" IS NOT NULL;--> statement-breakpoint
-- order_images_order_id_type_unique already serves lookups by order_id.
DROP INDEX "idx_order_images_order";--> statement-breakpoint
-- NOT VALID: enforced for new and changed rows, so rows stored earlier can't fail the migration.
ALTER TABLE "orders" ADD CONSTRAINT "orders_subtotal_range" CHECK ("orders"."subtotal" BETWEEN 0 AND 1000000) NOT VALID;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_number_length" CHECK (char_length("orders"."order_number") BETWEEN 1 AND 40) NOT VALID;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_notes_length" CHECK (char_length("orders"."notes") <= 500) NOT VALID;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_format" CHECK ("orders"."currency" ~ '^[A-Z]{3}$') NOT VALID;
