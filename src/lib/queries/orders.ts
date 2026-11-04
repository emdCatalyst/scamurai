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
  lt,
  isNull,
  isNotNull,
  count,
  countDistinct,
  desc,
  asc,
  sum,
  type SQL,
} from "drizzle-orm";
import { normalizeOrderNumber } from "@/lib/orders/input";
import { escapeLikePattern } from "./applications";

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
  /** Exclusive: the start of the day after the last one picked. */
  dateBefore?: Date;
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

/**
 * A brand's orders as finance counts them, in lists, totals, dashboards and
 * branch counts. `upload-urls` inserts the row before the photos are
 * uploaded; it counts as an order once confirm saw both (confirmed_at). The
 * partial indexes on orders cover exactly these rows.
 */
export function confirmedOrdersOf(brandId: string): SQL {
  return and(eq(orders.brandId, brandId), isNull(orders.deletedAt), isNotNull(orders.confirmedAt))!;
}

function buildOrdersWhere(params: GetOrdersParams): SQL | undefined {
  const filters: SQL[] = [confirmedOrdersOf(params.brandId)];

  if (params.branchId) {
    filters.push(eq(orders.branchId, params.branchId));
  }

  if (params.deliveryAppId) {
    filters.push(eq(orders.deliveryAppId, params.deliveryAppId));
  }

  if (params.dateFrom) {
    filters.push(gte(orders.submittedAt, params.dateFrom));
  }

  if (params.dateBefore) {
    filters.push(lt(orders.submittedAt, params.dateBefore));
  }

  const search = params.search?.trim();
  if (search) {
    // Order numbers are stored normalized, so "#١٢٣٤" finds 1234; names are searched as typed.
    const number = normalizeOrderNumber(search);
    const byName = ilike(users.fullName, `%${escapeLikePattern(search)}%`);
    filters.push(number ? or(ilike(orders.orderNumber, `%${escapeLikePattern(number)}%`), byName)! : byName);
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
    })
    .from(orders)
    .innerJoin(branches, eq(branches.id, orders.branchId))
    .innerJoin(brandDeliveryApps, eq(brandDeliveryApps.id, orders.deliveryAppId))
    .innerJoin(
      deliveryAppCatalog,
      eq(deliveryAppCatalog.id, brandDeliveryApps.catalogAppId)
    )
    .innerJoin(users, eq(users.id, orders.submittedBy))
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

  // Staff names are only needed to search by them; without the join the count reads the index alone.
  const totalQuery = db.select({ count: count() }).from(orders).$dynamic();
  if (params.search?.trim()) totalQuery.innerJoin(users, eq(users.id, orders.submittedBy));
  const [totalResult] = await totalQuery.where(whereClause).execute();

  return {
    // buildOrdersWhere returns confirmed orders only, all with both photos.
    rows: rows.map((row) => ({ ...row, hasBothImages: true })) as OrderRow[],
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
    // Like the list: an order whose photos haven't arrived isn't one yet.
    .where(and(eq(orders.id, orderId), confirmedOrdersOf(brandId)))
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
