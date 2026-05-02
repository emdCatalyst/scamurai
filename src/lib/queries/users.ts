import { db } from "@/lib/db";
import { users, brands, branches } from "@/lib/db/schema";
import { eq, and, ilike, or, desc, asc, count, isNull, ne } from "drizzle-orm";

export type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: "brand_admin" | "finance" | "staff";
  isActive: boolean;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
  branchId: string | null;
  branchName: string | null;
  onboardingComplete: boolean;
  joinedAt: Date | null;
  createdAt: Date;
};

export type GetUsersParams = {
  search?: string;
  role?: "brand_admin" | "finance" | "staff" | "all";
  status?: "active" | "inactive" | "all";
  brandId?: string;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc";
  page?: number;
  pageSize?: number;
};

export async function getUsers({
  search,
  role = "all",
  status = "all",
  brandId,
  sort = "newest",
  page = 1,
  pageSize = 20,
}: GetUsersParams) {
  const offset = (page - 1) * pageSize;

  const filters = [
    isNull(users.deletedAt),
    ne(users.role, "master_admin")
  ];

  if (search) {
    filters.push(
      or(
        ilike(users.fullName, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )!
    );
  }

  if (role !== "all") {
    filters.push(eq(users.role, role));
  }

  if (status !== "all") {
    filters.push(eq(users.isActive, status === "active"));
  }

  if (brandId) {
    filters.push(eq(users.brandId, brandId));
  }

  const whereClause = and(...filters);

  const query = db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role as unknown as ("brand_admin" | "finance" | "staff"),
      isActive: users.isActive,
      brandId: users.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
      branchId: users.branchId,
      branchName: branches.name,
      onboardingComplete: users.onboardingComplete,
      joinedAt: users.joinedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(brands, eq(users.brandId, brands.id))
    .leftJoin(branches, eq(users.branchId, branches.id))
    .where(whereClause);

  switch (sort) {
    case "oldest":
      query.orderBy(asc(users.createdAt));
      break;
    case "name_asc":
      query.orderBy(asc(users.fullName));
      break;
    case "name_desc":
      query.orderBy(desc(users.fullName));
      break;
    case "newest":
    default:
      query.orderBy(desc(users.createdAt));
      break;
  }

  const rows = await query.limit(pageSize).offset(offset).execute();

  const [countResult] = await db
    .select({ count: count() })
    .from(users)
    .where(whereClause)
    .execute();

  // Stats query
  const statsResult = await db
    .select({
      isActive: users.isActive,
      count: count(),
    })
    .from(users)
    .where(and(isNull(users.deletedAt), ne(users.role, "master_admin")))
    .groupBy(users.isActive)
    .execute();

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
    rows: rows as UserRow[],
    total: Number(countResult.count),
    counts,
  };
}

export async function getUserByClerkId(clerkUserId: string) {
  return await db.query.users.findFirst({
    where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
    with: {
      brand: true,
    },
  });
}
