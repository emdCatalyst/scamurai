CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" text DEFAULT 'dispute_orders' NOT NULL,
	"brand_name" text NOT NULL,
	"contact_name" text,
	"contact_email" text NOT NULL,
	"phone" text,
	"branch_count" integer,
	"plan" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_note" text,
	"payment_reference" text,
	"payment_confirmed_by" text,
	"brand_id" uuid,
	"quoted_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_status_values" CHECK ("applications"."status" IN ('pending', 'quoted', 'paid', 'approved', 'rejected')),
	CONSTRAINT "applications_plan_values" CHECK ("applications"."plan" IS NULL OR "applications"."plan" IN ('starter', 'growth', 'enterprise')),
	CONSTRAINT "applications_service_values" CHECK ("applications"."service" IN ('dispute_orders', 'compliance', 'receiving')),
	CONSTRAINT "applications_locale_values" CHECK ("applications"."locale" IN ('en', 'ar')),
	CONSTRAINT "applications_branch_count_range" CHECK ("applications"."branch_count" IS NULL OR "applications"."branch_count" BETWEEN 1 AND 10000)
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "branches_brand_id_name_unique" UNIQUE("brand_id","name")
);
--> statement-breakpoint
CREATE TABLE "brand_delivery_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"catalog_app_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_delivery_apps_brand_id_catalog_app_id_unique" UNIQUE("brand_id","catalog_app_id")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'starter' NOT NULL,
	"logo_url" text,
	"brand_colors" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"custom_max_branches" integer,
	"custom_max_users" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "brands_name_unique" UNIQUE("name"),
	CONSTRAINT "brands_slug_unique" UNIQUE("slug"),
	CONSTRAINT "brands_slug_format" CHECK ("brands"."slug" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "brands_plan_values" CHECK ("brands"."plan" IN ('starter', 'growth', 'enterprise'))
);
--> statement-breakpoint
CREATE TABLE "delivery_app_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "delivery_app_catalog_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "order_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"type" text NOT NULL,
	"storage_path" text NOT NULL,
	"storage_url" text NOT NULL,
	"file_size_kb" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_images_order_id_type_unique" UNIQUE("order_id","type"),
	CONSTRAINT "order_images_type_values" CHECK ("order_images"."type" IN ('opened', 'sealed'))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"delivery_app_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"subtotal" numeric(12, 2),
	"currency" text DEFAULT 'SAR' NOT NULL,
	"status" text DEFAULT 'needs_review' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"notes" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "orders_brand_id_order_number_branch_id_unique" UNIQUE("brand_id","order_number","branch_id"),
	CONSTRAINT "orders_status_values" CHECK ("orders"."status" IN ('needs_review', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"clerk_user_id" text,
	"role" text NOT NULL,
	"brand_id" uuid,
	"branch_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_role_values" CHECK ("users"."role" IN ('master_admin', 'brand_admin', 'finance', 'staff'))
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_delivery_apps" ADD CONSTRAINT "brand_delivery_apps_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_delivery_apps" ADD CONSTRAINT "brand_delivery_apps_catalog_app_id_delivery_app_catalog_id_fk" FOREIGN KEY ("catalog_app_id") REFERENCES "public"."delivery_app_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_images" ADD CONSTRAINT "order_images_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_images" ADD CONSTRAINT "order_images_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_app_id_brand_delivery_apps_id_fk" FOREIGN KEY ("delivery_app_id") REFERENCES "public"."brand_delivery_apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_applications_status" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_applications_email" ON "applications" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "idx_applications_service_status" ON "applications" USING btree ("service","status");--> statement-breakpoint
CREATE INDEX "idx_applications_created_at" ON "applications" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_branches_brand" ON "branches" USING btree ("brand_id") WHERE "branches"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_brand_delivery_apps_brand" ON "brand_delivery_apps" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "idx_brand_delivery_apps_catalog" ON "brand_delivery_apps" USING btree ("catalog_app_id");--> statement-breakpoint
CREATE INDEX "idx_brands_slug" ON "brands" USING btree ("slug") WHERE "brands"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_brands_is_active" ON "brands" USING btree ("is_active") WHERE "brands"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_brands_plan" ON "brands" USING btree ("plan") WHERE "brands"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_brands_name" ON "brands" USING btree ("name") WHERE "brands"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_catalog_apps_active" ON "delivery_app_catalog" USING btree ("is_active") WHERE "delivery_app_catalog"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_order_images_order" ON "order_images" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_brand" ON "orders" USING btree ("brand_id","status") WHERE "orders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_branch" ON "orders" USING btree ("brand_id","branch_id") WHERE "orders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_submitted_at" ON "orders" USING btree ("brand_id","submitted_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_users_brand" ON "users" USING btree ("brand_id") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_branch" ON "users" USING btree ("branch_id") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_clerk_id" ON "users" USING btree ("clerk_user_id") WHERE "users"."deleted_at" IS NULL;