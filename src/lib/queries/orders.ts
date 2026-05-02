import { db } from "@/lib/db";
import {
  orders,
  orderImages,
  branches,
  brandDeliveryApps,
  deliveryAppCatalog,
  users,
} from "@/lib/db/schema";
import {
  eq,
  and,
  or,
  ilike,
  gte,
  lte,
  isNull,
  count,
  countDistinct,
  desc,
  asc,
  sum,
  sql,
  type SQL,
} from "drizzle-orm";

/**
 * Generates the next order number for a brand for today.
 * Format: ORD-YYYYMMDD-XXXX
 */
export async function generateOrderNumber(brandId: string) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ count: todayCount }] = await db
    .select({ count: count() })
    .from(orders)
    .where(
      and(
        eq(orders.brandId, brandId),
        gte(orders.submittedAt, startOfToday),
        isNull(orders.deletedAt)
      )
    );

  const sequence = (Number(todayCount) + 1).toString().padStart(4, "0");
  return `ORD-${dateStr}-${sequence}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance Orders page — list, summary, dropdown sources
// ─────────────────────────────────────────────────────────────────────────────

export type OrderSort = "newest" | "oldest" | "amount_high" | "amount_low";

export interface GetOrdersParams {
  brandId: string;
  search?: string;
  branchId?: string;
  deliveryAppId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: OrderSort;
  page?: number;
  pageSize?: number;
}

export type OrderRow = {
  id: string;
  orderNumber: string;
  branchName: string;
  deliveryAppName: string;
  deliveryAppLogoUrl: string | null;
  submittedByName: string;
  submittedByEmail: string;
  subtotal: string | null;
  currency: string;
  notes: string | null;
  submittedAt: Date;
  hasBothImages: boolean;
};

function buildOrdersWhere(params: GetOrdersParams): SQL | undefined {
  const filters: SQL[] = [
    eq(orders.brandId, params.brandId),
    isNull(orders.deletedAt),
  ];

  if (params.branchId) {
    filters.push(eq(orders.branchId, params.branchId));
  }

  if (params.deliveryAppId) {
    filters.push(eq(orders.deliveryAppId, params.deliveryAppId));
  }

  if (params.dateFrom) {
    filters.push(gte(orders.submittedAt, params.dateFrom));
  }

  if (params.dateTo) {
    filters.push(lte(orders.submittedAt, params.dateTo));
  }

  if (params.search) {
    const term = `%${params.search}%`;
    filters.push(
      or(ilike(orders.orderNumber, term), ilike(users.fullName, term))!
    );
  }

  return and(...filters);
}

export async function getOrders(params: GetOrdersParams) {
  const {
    sort = "newest",
    page = 1,
    pageSize = 30,
  } = params;
  const offset = (page - 1) * pageSize;

  const whereClause = buildOrdersWhere(params);

  const imageCountSub = db
    .select({
      orderId: orderImages.orderId,
      cnt: count(orderImages.id).as("img_count"),
    })
    .from(orderImages)
    .groupBy(orderImages.orderId)
    .as("order_image_counts");

  const query = db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      branchName: branches.name,
      deliveryAppName: deliveryAppCatalog.name,
      deliveryAppLogoUrl: deliveryAppCatalog.logoUrl,
      submittedByName: users.fullName,
      submittedByEmail: users.email,
      subtotal: orders.subtotal,
      currency: orders.currency,
      notes: orders.notes,
      submittedAt: orders.submittedAt,
      imageCount: sql<number>`COALESCE(${imageCountSub.cnt}, 0)`,
    })
    .from(orders)
    .innerJoin(branches, eq(branches.id, orders.branchId))
    .innerJoin(brandDeliveryApps, eq(brandDeliveryApps.id, orders.deliveryAppId))
    .innerJoin(
      deliveryAppCatalog,
      eq(deliveryAppCatalog.id, brandDeliveryApps.catalogAppId)
    )
    .innerJoin(users, eq(users.id, orders.submittedBy))
    .leftJoin(imageCountSub, eq(imageCountSub.orderId, orders.id))
    .where(whereClause);

  switch (sort) {
    case "oldest":
      query.orderBy(asc(orders.submittedAt));
      break;
    case "amount_high":
      query.orderBy(desc(orders.subtotal));
      break;
    case "amount_low":
      query.orderBy(asc(orders.subtotal));
      break;
    case "newest":
    default:
      query.orderBy(desc(orders.submittedAt));
      break;
  }

  const rows = await query.limit(pageSize).offset(offset).execute();

  const [totalResult] = await db
    .select({ count: count() })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.submittedBy))
    .where(whereClause)
    .execute();

  return {
    rows: rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      branchName: row.branchName,
      deliveryAppName: row.deliveryAppName,
      deliveryAppLogoUrl: row.deliveryAppLogoUrl,
      submittedByName: row.submittedByName,
      submittedByEmail: row.submittedByEmail,
      subtotal: row.subtotal,
      currency: row.currency,
      notes: row.notes,
      submittedAt: row.submittedAt,
      hasBothImages: Number(row.imageCount) >= 2,
    })) as OrderRow[],
    total: Number(totalResult.count),
  };
}

export type OrdersSummary = {
  count: number;
  branchCount: number;
  totalsByCurrency: Record<string, number>;
};

export async function getOrdersSummary(
  params: GetOrdersParams
): Promise<OrdersSummary> {
  const whereClause = buildOrdersWhere(params);

  const [aggregate] = await db
    .select({
      count: count(),
      branchCount: countDistinct(orders.branchId),
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.submittedBy))
    .where(whereClause)
    .execute();

  const totalsRows = await db
    .select({
      currency: orders.currency,
      total: sum(orders.subtotal),
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.submittedBy))
    .where(whereClause)
    .groupBy(orders.currency)
    .execute();

  const totalsByCurrency: Record<string, number> = {};
  for (const row of totalsRows) {
    totalsByCurrency[row.currency] = Number(row.total ?? 0);
  }

  return {
    count: Number(aggregate?.count ?? 0),
    branchCount: Number(aggregate?.branchCount ?? 0),
    totalsByCurrency,
  };
}

/** Active branches for the brand — used by the Branch filter dropdown. */
export async function getActiveBranchOptions(brandId: string) {
  return await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(
      and(
        eq(branches.brandId, brandId),
        eq(branches.isActive, true),
        isNull(branches.deletedAt)
      )
    )
    .orderBy(asc(branches.name))
    .execute();
}

/** Enabled brand delivery apps with catalog name + logo — used by the App filter dropdown. */
export async function getEnabledDeliveryAppOptions(brandId: string) {
  return await db
    .select({
      id: brandDeliveryApps.id,
      name: deliveryAppCatalog.name,
      logoUrl: deliveryAppCatalog.logoUrl,
    })
    .from(brandDeliveryApps)
    .innerJoin(
      deliveryAppCatalog,
      eq(deliveryAppCatalog.id, brandDeliveryApps.catalogAppId)
    )
    .where(
      and(
        eq(brandDeliveryApps.brandId, brandId),
        eq(brandDeliveryApps.isActive, true),
        isNull(deliveryAppCatalog.deletedAt)
      )
    )
    .orderBy(asc(deliveryAppCatalog.name))
    .execute();
}

/** Order detail used by the drawer (server-loaded on open). */
export type OrderDetail = OrderRow & {
  brandId: string;
  images: { type: "sealed" | "opened"; storagePath: string }[];
};

export async function getOrderDetail(
  orderId: string,
  brandId: string
): Promise<OrderDetail | null> {
  const [row] = await db
    .select({
      id: orders.id,
      brandId: orders.brandId,
      orderNumber: orders.orderNumber,
      branchName: branches.name,
      deliveryAppName: deliveryAppCatalog.name,
      deliveryAppLogoUrl: deliveryAppCatalog.logoUrl,
      submittedByName: users.fullName,
      submittedByEmail: users.email,
      subtotal: orders.subtotal,
      currency: orders.currency,
      notes: orders.notes,
      submittedAt: orders.submittedAt,
    })
    .from(orders)
    .innerJoin(branches, eq(branches.id, orders.branchId))
    .innerJoin(brandDeliveryApps, eq(brandDeliveryApps.id, orders.deliveryAppId))
    .innerJoin(
      deliveryAppCatalog,
      eq(deliveryAppCatalog.id, brandDeliveryApps.catalogAppId)
    )
    .innerJoin(users, eq(users.id, orders.submittedBy))
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.brandId, brandId),
        isNull(orders.deletedAt)
      )
    )
    .limit(1)
    .execute();

  if (!row) return null;

  const images = await db
    .select({ type: orderImages.type, storagePath: orderImages.storagePath })
    .from(orderImages)
    .where(eq(orderImages.orderId, orderId))
    .execute();

  return {
    ...row,
    hasBothImages: images.length >= 2,
    images: images.map((i) => ({
      type: i.type as "sealed" | "opened",
      storagePath: i.storagePath,
    })),
  };
}
