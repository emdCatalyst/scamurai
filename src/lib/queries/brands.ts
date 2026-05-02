import { db } from "@/lib/db";
import { brands, users, branches } from "@/lib/db/schema";
import { eq, and, ilike, or, sql, desc, asc, count, isNull } from "drizzle-orm";

export type BrandColors = {
  primary: string;
  background: string;
  surface: string;
  textAccent: string;
};

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  logoUrl: string | null;
  brandColors: BrandColors | null;
  createdAt: Date;
  branchCount: number;
  brandAdminEmail: string | null;
  brandAdminJoinedAt: Date | null;
  onboardingComplete: boolean | null;
};

export type GetBrandsParams = {
  search?: string;
  status?: "active" | "suspended" | "all";
  plan?: "starter" | "growth" | "enterprise" | "all";
  sort?: "newest" | "oldest" | "name_asc" | "name_desc";
  page?: number;
  pageSize?: number;
};

export async function getBrands({
  search,
  status = "all",
  plan = "all",
  sort = "newest",
  page = 1,
  pageSize = 20,
}: GetBrandsParams) {
  const offset = (page - 1) * pageSize;

  const filters = [isNull(brands.deletedAt)];

  if (search) {
    filters.push(
      or(
        ilike(brands.name, `%${search}%`),
        ilike(brands.slug, `%${search}%`)
      )!
    );
  }

  if (status !== "all") {
    filters.push(eq(brands.isActive, status === "active"));
  }

  if (plan !== "all") {
    filters.push(eq(brands.plan, plan));
  }

  const whereClause = and(...filters);

  // Subquery for branch count
  const branchCountSub = db
    .select({
      brandId: branches.brandId,
      count: count(branches.id).as("count"),
    })
    .from(branches)
    .where(isNull(branches.deletedAt))
    .groupBy(branches.brandId)
    .as("branch_counts");

  // Query for brands joined with brand admin and branch count
  const query = db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      plan: brands.plan,
      isActive: brands.isActive,
      logoUrl: brands.logoUrl,
      brandColors: brands.brandColors,
      createdAt: brands.createdAt,
      branchCount: sql<number>`COALESCE(${branchCountSub.count}, 0)`,
      brandAdminEmail: users.email,
      brandAdminJoinedAt: users.joinedAt,
      onboardingComplete: users.onboardingComplete,
    })
    .from(brands)
    .leftJoin(
      users,
      and(eq(users.brandId, brands.id), eq(users.role, "brand_admin"))
    )
    .leftJoin(branchCountSub, eq(branchCountSub.brandId, brands.id))
    .where(whereClause);

  // Sorting
  switch (sort) {
    case "oldest":
      query.orderBy(asc(brands.createdAt));
      break;
    case "name_asc":
      query.orderBy(asc(brands.name));
      break;
    case "name_desc":
      query.orderBy(desc(brands.name));
      break;
    case "newest":
    default:
      query.orderBy(desc(brands.createdAt));
      break;
  }

  // Count query for all/active/suspended
  const countsResult = await db
    .select({
      isActive: brands.isActive,
      count: count(),
    })
    .from(brands)
    .where(isNull(brands.deletedAt))
    .groupBy(brands.isActive)
    .execute();

  const rows = await query.limit(pageSize).offset(offset).execute();

  const [countResult] = await db
    .select({ count: count() })
    .from(brands)
    .where(whereClause)
    .execute();

  const counts: Record<string, number> = {
    all: 0,
    active: 0,
    suspended: 0,
  };

  countsResult.forEach((item) => {
    const c = Number(item.count);
    if (item.isActive) {
      counts.active = c;
    } else {
      counts.suspended = c;
    }
    counts.all += c;
  });

  return {
    rows: rows.map(row => ({
      ...row,
      branchCount: Number(row.branchCount),
    })) as BrandRow[],
    total: Number(countResult.count),
    counts,
  };
}

export async function getBrandStats() {
  const result = await db
    .select({
      isActive: brands.isActive,
      count: count(),
    })
    .from(brands)
    .where(isNull(brands.deletedAt))
    .groupBy(brands.isActive)
    .execute();

  const stats = {
    active: 0,
    suspended: 0,
    total: 0,
  };

  result.forEach((row) => {
    const c = Number(row.count);
    if (row.isActive) {
      stats.active = c;
    } else {
      stats.suspended = c;
    }
    stats.total += c;
  });

  return stats;
}

export async function getBrandBySlug(slug: string) {
  return await db.query.brands.findFirst({
    where: and(eq(brands.slug, slug), isNull(brands.deletedAt)),
  });
}

