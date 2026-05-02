import { db } from "@/lib/db";
import { users, branches, brands } from "@/lib/db/schema";
import { eq, and, ilike, or, desc, asc, count, isNull, inArray } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { PLANS, PlanKey } from "@/config/plans";

export type BrandUserRow = {
  id: string;
  fullName: string;
  email: string;
  role: "finance" | "staff";
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  mustChangePassword: boolean;
  joinedAt: string | null;
  createdAt: Date;
};

export type GetBrandUsersParams = {
  brandId: string;
  search?: string;
  role?: "finance" | "staff" | "all";
  status?: "active" | "inactive" | "all";
  branchId?: string;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc";
  page?: number;
  pageSize?: number;
};

export async function getBrandUsers({
  brandId,
  search,
  role = "all",
  status = "all",
  branchId,
  sort = "newest",
  page = 1,
  pageSize = 20,
}: GetBrandUsersParams) {
  const offset = (page - 1) * pageSize;

  const filters = [
    eq(users.brandId, brandId),
    isNull(users.deletedAt),
    inArray(users.role, ["finance", "staff"]),
  ];

  if (search) {
    filters.push(
      or(
        ilike(users.fullName, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )!
    );
  }

  if (role !== "all" && role !== undefined) {
    filters.push(eq(users.role, role));
  }

  if (status !== "all" && status !== undefined) {
    filters.push(eq(users.isActive, status === "active"));
  }

  if (branchId && branchId !== "all") {
    filters.push(eq(users.branchId, branchId));
  }

  const whereClause = and(...filters);

  const query = db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      branchId: users.branchId,
      branchName: branches.name,
      clerkUserId: users.clerkUserId,
      joinedAt: users.joinedAt,
      createdAt: users.createdAt,
    })
    .from(users)
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

  const dbRows = await query.limit(pageSize).offset(offset).execute();

  const [countResult] = await db
    .select({ count: count() })
    .from(users)
    .where(whereClause)
    .execute();

  // Tab counts
  const tabCountsResult = await db
    .select({
      role: users.role,
      count: count(),
    })
    .from(users)
    .where(
      and(
        eq(users.brandId, brandId),
        isNull(users.deletedAt),
        inArray(users.role, ["finance", "staff"])
      )
    )
    .groupBy(users.role)
    .execute();

  const tabCounts = {
    all: 0,
    finance: 0,
    staff: 0,
  };

  tabCountsResult.forEach((item) => {
    const c = Number(item.count);
    if (item.role === "finance") {
      tabCounts.finance = c;
    } else if (item.role === "staff") {
      tabCounts.staff = c;
    }
    tabCounts.all += c;
  });

  // Fetch clerk data for mustChangePassword
  const clerkUserIds = dbRows.map(r => r.clerkUserId).filter((id): id is string => id !== null);
  const clerkUsersMap: Record<string, boolean> = {};

  if (clerkUserIds.length > 0) {
    try {
      const client = await clerkClient();
      const clerkData = await client.users.getUserList({ userId: clerkUserIds, limit: clerkUserIds.length });
      clerkData.data.forEach(cu => {
        clerkUsersMap[cu.id] = cu.publicMetadata?.mustChangePassword === true;
      });
    } catch (e) {
      console.error("Failed to fetch Clerk users in getBrandUsers", e);
    }
  }

  const rows: BrandUserRow[] = dbRows.map(r => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role as "finance" | "staff",
    isActive: r.isActive,
    branchId: r.branchId,
    branchName: r.branchName,
    mustChangePassword: r.clerkUserId ? clerkUsersMap[r.clerkUserId] || false : false,
    joinedAt: r.joinedAt ? r.joinedAt.toISOString() : null,
    createdAt: r.createdAt,
  }));

  return {
    rows,
    total: Number(countResult.count),
    tabCounts,
  };
}

export async function countNonDeletedUsers(brandId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.brandId, brandId),
        isNull(users.deletedAt),
        inArray(users.role, ["finance", "staff"])
      )
    );
  return Number(result.count);
}

export async function getBrandUserLimit(brandId: string) {
  const brand = await db.query.brands.findFirst({
    where: eq(brands.id, brandId),
    columns: { plan: true, customMaxUsers: true },
  });

  if (!brand) return 0;

  const planLimit = PLANS[brand.plan as PlanKey]?.max_users || 0;
  return brand.customMaxUsers || planLimit;
}
