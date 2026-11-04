import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  unique,
  uniqueIndex,
  index,
  check,
  jsonb,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
// Relative imports (not "@/") so drizzle-kit can resolve them outside Next.
import { DEFAULT_SERVICE_KEY, PLAN_TIERS, SERVICE_KEYS } from "../../config/services";
import { APPLICATION_STATUSES } from "../applications/status";

/** `'a', 'b', 'c'` — keeps CHECK constraints in sync with the TS unions. */
const sqlList = (values: readonly string[]) =>
  sql.raw(values.map((value) => `'${value}'`).join(", "));


// ─────────────────────────────────────────────────────────────────────────────
// brands
// The root multi-tenant entity. Created by master admin only.
// ─────────────────────────────────────────────────────────────────────────────
export const brands = pgTable(
  "brands",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull().unique(),
    slug: text().notNull().unique(),
    plan: text().notNull().default("starter"),
    logoUrl: text("logo_url"),
    brandColors: jsonb("brand_colors").$type<{
      primary: string;
      background: string;
      surface: string;
      textAccent: string;
    }>(),
    isActive: boolean("is_active").notNull().default(true),
    customMaxBranches: integer("custom_max_branches"),
    customMaxUsers: integer("custom_max_users"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_brands_slug")
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_brands_is_active")
      .on(table.isActive)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_brands_plan")
      .on(table.plan)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_brands_name")
      .on(table.name)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "brands_slug_format",
      sql`${table.slug} ~ '^[a-z0-9-]+$'`
    ),
    check(
      "brands_plan_values",
      sql`${table.plan} IN ('starter', 'growth', 'enterprise')`
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// applications
// Public form submissions from prospective customers, one per requested
// service. Lifecycle: pending → quoted → paid → approved (or rejected).
// Applications for coming-soon services are interest registrations: they have
// no plan and stay pending until the service launches.
// Migration: db/sql/0001_multi_service_applications.up.sql
// ─────────────────────────────────────────────────────────────────────────────
export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    service: text().notNull().default(DEFAULT_SERVICE_KEY),
    brandName: text("brand_name").notNull(),
    contactName: text("contact_name"),
    contactEmail: text("contact_email").notNull(),
    phone: text(),
    branchCount: integer("branch_count"),
    /** Null for interest registrations (coming-soon services). */
    plan: text(),
    /** Language the applicant used — drives email language and invite links. */
    locale: text().notNull().default("en"),
    status: text().notNull().default("pending"),
    rejectionNote: text("rejection_note"),
    paymentReference: text("payment_reference"),
    /** Clerk user id of the admin who confirmed the payment. */
    paymentConfirmedBy: text("payment_confirmed_by"),
    brandId: uuid("brand_id").references(() => brands.id),
    quotedAt: timestamp("quoted_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_applications_status").on(table.status),
    index("idx_applications_email").on(table.contactEmail),
    index("idx_applications_service_status").on(table.service, table.status),
    index("idx_applications_created_at").on(sql`${table.createdAt} DESC`),
    check(
      "applications_status_values",
      sql`${table.status} IN (${sqlList(APPLICATION_STATUSES)})`
    ),
    check(
      "applications_plan_values",
      sql`${table.plan} IS NULL OR ${table.plan} IN (${sqlList(PLAN_TIERS)})`
    ),
    check(
      "applications_service_values",
      sql`${table.service} IN (${sqlList(SERVICE_KEYS)})`
    ),
    check(
      "applications_locale_values",
      sql`${table.locale} IN ('en', 'ar')`
    ),
    check(
      "applications_branch_count_range",
      sql`${table.branchCount} IS NULL OR ${table.branchCount} BETWEEN 1 AND 10000`
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// users
// All users across all roles — master admin, brand admins, finance, staff.
// ─────────────────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull().unique(),
    fullName: text("full_name").notNull(),
    clerkUserId: text("clerk_user_id").unique(),
    role: text().notNull(),
    brandId: uuid("brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    invitedBy: uuid("invited_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_users_brand")
      .on(table.brandId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_users_email")
      .on(table.email)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_users_branch")
      .on(table.branchId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_users_clerk_id")
      .on(table.clerkUserId)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "users_role_values",
      sql`${table.role} IN ('master_admin', 'brand_admin', 'finance', 'staff')`
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// branches
// Physical or virtual locations within a brand. Created by brand admin,
// capped by plan.
// ─────────────────────────────────────────────────────────────────────────────
export const branches = pgTable(
  "branches",
  {
    id: uuid().primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    name: text().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("branches_brand_id_name_unique").on(table.brandId, table.name),
    index("idx_branches_brand")
      .on(table.brandId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// delivery_app_catalog
// Platform-level catalog managed by master admin.
// ─────────────────────────────────────────────────────────────────────────────
export const deliveryAppCatalog = pgTable(
  "delivery_app_catalog",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull().unique(),
    logoUrl: text("logo_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_catalog_apps_active")
      .on(table.isActive)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// brand_delivery_apps
// Represents which catalog platforms a brand has enabled.
// ─────────────────────────────────────────────────────────────────────────────
export const brandDeliveryApps = pgTable(
  "brand_delivery_apps",
  {
    id: uuid().primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    catalogAppId: uuid("catalog_app_id")
      .notNull()
      .references(() => deliveryAppCatalog.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("brand_delivery_apps_brand_id_catalog_app_id_unique").on(
      table.brandId,
      table.catalogAppId
    ),
    index("idx_brand_delivery_apps_brand").on(table.brandId),
    index("idx_brand_delivery_apps_catalog").on(table.catalogAppId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// orders
// Core domain entity. Submitted by staff, viewable by finance and brand admin.
// The row is created when the phone asks for upload URLs; it counts as an
// order only once confirm has seen both photos (confirmed_at).
// ─────────────────────────────────────────────────────────────────────────────
export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    deliveryAppId: uuid("delivery_app_id")
      .notNull()
      .references(() => brandDeliveryApps.id),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    subtotal: numeric({ precision: 12, scale: 2 }),
    currency: text().notNull().default("SAR"),
    status: text().notNull().default("needs_review"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    notes: text(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** When both photos arrived. Null while the phone is still uploading: finance never sees those rows. */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // One live order per number in each branch and delivery app: two apps
    // can hand out the same number. Soft-deleting an abandoned upload frees it.
    uniqueIndex("orders_live_number_unique")
      .on(table.brandId, table.branchId, table.deliveryAppId, table.orderNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    // Finance lists, counts and dashboards read confirmed orders only.
    index("idx_orders_brand")
      .on(table.brandId, table.status)
      .where(sql`${table.deletedAt} IS NULL AND ${table.confirmedAt} IS NOT NULL`),
    index("idx_orders_branch")
      .on(table.brandId, table.branchId, sql`${table.submittedAt} DESC`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.confirmedAt} IS NOT NULL`),
    index("idx_orders_submitted_at")
      .on(table.brandId, sql`${table.submittedAt} DESC`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.confirmedAt} IS NOT NULL`),
    check(
      "orders_status_values",
      sql`${table.status} IN ('needs_review', 'approved', 'rejected')`
    ),
    // The limits of src/lib/orders/input.ts (AMOUNT_MAX, ORDER_NUMBER_MAX_LENGTH,
    // NOTES_MAX_LENGTH), so no other path can store NaN, negative or huge values.
    check(
      "orders_subtotal_range",
      sql`${table.subtotal} BETWEEN 0 AND 1000000`
    ),
    check(
      "orders_order_number_length",
      sql`char_length(${table.orderNumber}) BETWEEN 1 AND 40`
    ),
    check("orders_notes_length", sql`char_length(${table.notes}) <= 500`),
    check("orders_currency_format", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// order_images
// Photos attached to an order. Exactly two per order: opened and sealed.
// ─────────────────────────────────────────────────────────────────────────────
export const orderImages = pgTable(
  "order_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text().notNull(),
    storagePath: text("storage_path").notNull(),
    storageUrl: text("storage_url").notNull(),
    fileSizeKb: integer("file_size_kb"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Also serves lookups by order_id alone.
    unique("order_images_order_id_type_unique").on(table.orderId, table.type),
    check(
      "order_images_type_values",
      sql`${table.type} IN ('opened', 'sealed')`
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const brandsRelations = relations(brands, ({ many }) => ({
  users: many(users),
  branches: many(branches),
  deliveryApps: many(brandDeliveryApps),
  orders: many(orders),
  orderImages: many(orderImages),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  brand: one(brands, {
    fields: [applications.brandId],
    references: [brands.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  brand: one(brands, {
    fields: [users.brandId],
    references: [brands.id],
  }),
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
  inviter: one(users, {
    fields: [users.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
  invitees: many(users, { relationName: "inviter" }),
  submittedOrders: many(orders, { relationName: "submitter" }),
  reviewedOrders: many(orders, { relationName: "reviewer" }),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  brand: one(brands, {
    fields: [branches.brandId],
    references: [brands.id],
  }),
  users: many(users),
  orders: many(orders),
}));

export const deliveryAppCatalogRelations = relations(
  deliveryAppCatalog,
  ({ many }) => ({
    brandApps: many(brandDeliveryApps),
  })
);

export const brandDeliveryAppsRelations = relations(
  brandDeliveryApps,
  ({ one, many }) => ({
    brand: one(brands, {
      fields: [brandDeliveryApps.brandId],
      references: [brands.id],
    }),
    catalogApp: one(deliveryAppCatalog, {
      fields: [brandDeliveryApps.catalogAppId],
      references: [deliveryAppCatalog.id],
    }),
    orders: many(orders),
  })
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  brand: one(brands, {
    fields: [orders.brandId],
    references: [brands.id],
  }),
  branch: one(branches, {
    fields: [orders.branchId],
    references: [branches.id],
  }),
  deliveryApp: one(brandDeliveryApps, {
    fields: [orders.deliveryAppId],
    references: [brandDeliveryApps.id],
  }),
  submitter: one(users, {
    fields: [orders.submittedBy],
    references: [users.id],
    relationName: "submitter",
  }),
  reviewer: one(users, {
    fields: [orders.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
  images: many(orderImages),
}));

export const orderImagesRelations = relations(orderImages, ({ one }) => ({
  brand: one(brands, {
    fields: [orderImages.brandId],
    references: [brands.id],
  }),
  order: one(orders, {
    fields: [orderImages.orderId],
    references: [orders.id],
  }),
}));
