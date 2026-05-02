import { db } from "@/lib/db";
import { deliveryAppCatalog, brandDeliveryApps, brands } from "@/lib/db/schema";
import { eq, and, ilike, sql, desc, asc, count, isNull, inArray } from "drizzle-orm";

export type CatalogAppRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
  brandCount: number;
  createdAt: Date;
  brandsUsing: { id: string; name: string; slug: string }[];
};

export type GetCatalogAppsParams = {
  search?: string;
  status?: "active" | "inactive" | "all";
  sort?: "name_asc" | "name_desc" | "newest" | "most_used";
  page?: number;
  pageSize?: number;
};

export async function getCatalogApps({
  search,
  status = "all",
  sort = "name_asc",
  page = 1,
  pageSize = 20,
}: GetCatalogAppsParams) {
  const offset = (page - 1) * pageSize;

  const filters = [isNull(deliveryAppCatalog.deletedAt)];

  if (search) {
    filters.push(ilike(deliveryAppCatalog.name, `%${search}%`));
  }

  if (status !== "all") {
    filters.push(eq(deliveryAppCatalog.isActive, status === "active"));
  }

  const whereClause = and(...filters);

  // Subquery for brand count
  const brandCountSub = db
    .select({
      catalogAppId: brandDeliveryApps.catalogAppId,
      count: count(brandDeliveryApps.id).as("count"),
    })
    .from(brandDeliveryApps)
    .groupBy(brandDeliveryApps.catalogAppId)
    .as("brand_counts");

  const query = db
    .select({
      id: deliveryAppCatalog.id,
      name: deliveryAppCatalog.name,
      logoUrl: deliveryAppCatalog.logoUrl,
      isActive: deliveryAppCatalog.isActive,
      brandCount: sql<number>`COALESCE(${brandCountSub.count}, 0)`,
      createdAt: deliveryAppCatalog.createdAt,
    })
    .from(deliveryAppCatalog)
    .leftJoin(brandCountSub, eq(brandCountSub.catalogAppId, deliveryAppCatalog.id))
    .where(whereClause);

  switch (sort) {
    case "name_desc":
      query.orderBy(desc(deliveryAppCatalog.name));
      break;
    case "newest":
      query.orderBy(desc(deliveryAppCatalog.createdAt));
      break;
    case "most_used":
      query.orderBy(desc(sql`brand_count`));
      break;
    case "name_asc":
    default:
      query.orderBy(asc(deliveryAppCatalog.name));
      break;
  }

  const rows = await query.limit(pageSize).offset(offset).execute();

  const [countResult] = await db
    .select({ count: count() })
    .from(deliveryAppCatalog)
    .where(whereClause)
    .execute();

  const statsResult = await db
    .select({
      isActive: deliveryAppCatalog.isActive,
      count: count(),
    })
    .from(deliveryAppCatalog)
    .where(isNull(deliveryAppCatalog.deletedAt))
    .groupBy(deliveryAppCatalog.isActive)
    .execute();

  // Fetch brands for these apps
  const appIds = rows.map(r => r.id);
  const brandsUsing = appIds.length > 0 ? await db
    .select({
      appId: brandDeliveryApps.catalogAppId,
      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
    })
    .from(brandDeliveryApps)
    .innerJoin(brands, eq(brandDeliveryApps.brandId, brands.id))
    .where(and(isNull(brands.deletedAt), inArray(brandDeliveryApps.catalogAppId, appIds)))
    .execute() : [];

  const counts: Record<string, number> = {
    all: 0,
    active: 0,
    inactive: 0,
  };

  statsResult.forEach((item) => {
    const c = Number(item.count);
    if (item.isActive) {
      counts.active = c;
    } else {
      counts.inactive = c;
    }
    counts.all += c;
  });

  return {
    rows: rows.map(row => ({
      ...row,
      brandCount: Number(row.brandCount),
      brandsUsing: brandsUsing
        .filter(b => b.appId === row.id)
        .map(b => ({ id: b.brandId, name: b.brandName, slug: b.brandSlug })),
    })) as CatalogAppRow[],
    total: Number(countResult.count),
    counts,
  };
}

export async function getCatalogAppStats() {
  const result = await db
    .select({
      isActive: deliveryAppCatalog.isActive,
      count: count(),
    })
    .from(deliveryAppCatalog)
    .where(isNull(deliveryAppCatalog.deletedAt))
    .groupBy(deliveryAppCatalog.isActive)
    .execute();

  const stats = {
    active: 0,
    inactive: 0,
    total: 0,
  };

  result.forEach((row) => {
    const c = Number(row.count);
    if (row.isActive) {
      stats.active = c;
    } else {
      stats.inactive = c;
    }
    stats.total += c;
  });

  return stats;
}

export async function getActiveCatalogApps() {
  return await db
    .select({
      id: deliveryAppCatalog.id,
      name: deliveryAppCatalog.name,
      logoUrl: deliveryAppCatalog.logoUrl,
      isActive: deliveryAppCatalog.isActive,
    })
    .from(deliveryAppCatalog)
    .where(isNull(deliveryAppCatalog.deletedAt))
    .orderBy(asc(deliveryAppCatalog.name))
    .execute();
}

export async function getEnabledAppIdsForBrand(brandId: string) {
  const result = await db
    .select({
      catalogAppId: brandDeliveryApps.catalogAppId,
    })
    .from(brandDeliveryApps)
    .where(and(
      eq(brandDeliveryApps.brandId, brandId),
      eq(brandDeliveryApps.isActive, true)
    ))
    .execute();

  return result.map(r => r.catalogAppId);
}
