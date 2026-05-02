import { db } from "@/lib/db";
import { branches, users, orders, brands } from "@/lib/db/schema";
import { eq, and, ilike, sql, desc, asc, count, isNull, ne } from "drizzle-orm";
import { PLANS, PlanKey } from "@/config/plans";

export type BranchRow = {
  id: string;
  name: string;
  isActive: boolean;
  assignedStaffCount: number;
  orderCountThisMonth: number;
  createdAt: Date;
};

export type GetBranchesParams = {
  brandId: string;
  search?: string;
  status?: "active" | "inactive" | "all";
  sort?: "newest" | "oldest" | "name_asc" | "name_desc" | "most_orders";
  page?: number;
  pageSize?: number;
};

export async function getBranches({
  brandId,
  search,
  status = "all",
  sort = "newest",
  page = 1,
  pageSize = 20,
}: GetBranchesParams) {
  const offset = (page - 1) * pageSize;

  const filters = [eq(branches.brandId, brandId), isNull(branches.deletedAt)];

  if (search) {
    filters.push(ilike(branches.name, `%${search}%`));
  }

  if (status !== "all") {
    filters.push(eq(branches.isActive, status === "active"));
  }

  const whereClause = and(...filters);

  // Subquery for staff count
  const staffCountSub = db
    .select({
      branchId: users.branchId,
      staffCount: count(users.id).as("staff_count"),
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .groupBy(users.branchId)
    .as("staff_counts");

  // Subquery for order count this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const orderCountSub = db
    .select({
      branchId: orders.branchId,
      orderCount: count(orders.id).as("order_count"),
    })
    .from(orders)
    .where(
      and(
        isNull(orders.deletedAt),
        sql`${orders.submittedAt} >= ${startOfMonth.toISOString()}`
      )
    )
    .groupBy(orders.branchId)
    .as("order_counts");

  const query = db
    .select({
      id: branches.id,
      name: branches.name,
      isActive: branches.isActive,
      createdAt: branches.createdAt,
      assignedStaffCount: sql<number>`COALESCE(${staffCountSub.staffCount}, 0)`,
      orderCountThisMonth: sql<number>`COALESCE(${orderCountSub.orderCount}, 0)`,
    })
    .from(branches)
    .leftJoin(staffCountSub, eq(staffCountSub.branchId, branches.id))
    .leftJoin(orderCountSub, eq(orderCountSub.branchId, branches.id))
    .where(whereClause);

  // Sorting
  switch (sort) {
    case "oldest":
      query.orderBy(asc(branches.createdAt));
      break;
    case "name_asc":
      query.orderBy(asc(branches.name));
      break;
    case "name_desc":
      query.orderBy(desc(branches.name));
      break;
    case "most_orders":
      query.orderBy(desc(sql`order_counts.order_count`));
      break;
    case "newest":
    default:
      query.orderBy(desc(branches.createdAt));
      break;
  }

  const rows = await query.limit(pageSize).offset(offset).execute();

  const [countResult] = await db
    .select({ count: count() })
    .from(branches)
    .where(whereClause)
    .execute();

  // Counts for tabs
  const tabCountsResult = await db
    .select({
      isActive: branches.isActive,
      count: count(),
    })
    .from(branches)
    .where(and(eq(branches.brandId, brandId), isNull(branches.deletedAt)))
    .groupBy(branches.isActive)
    .execute();

  const tabCounts = {
    all: 0,
    active: 0,
    inactive: 0,
  };

  tabCountsResult.forEach((item) => {
    const c = Number(item.count);
    if (item.isActive) {
      tabCounts.active = c;
    } else {
      tabCounts.inactive = c;
    }
    tabCounts.all += c;
  });

  return {
    rows: rows.map((row) => ({
      ...row,
      assignedStaffCount: Number(row.assignedStaffCount),
      orderCountThisMonth: Number(row.orderCountThisMonth),
    })) as BranchRow[],
    total: Number(countResult.count),
    tabCounts,
  };
}

export async function getBranchDeletionConflicts(branchId: string) {
  const assignedStaff = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.branchId, branchId), isNull(users.deletedAt)));

  return { assignedStaff };
}

export async function countAllBranches(brandId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(branches)
    .where(
      and(
        eq(branches.brandId, brandId),
        isNull(branches.deletedAt)
      )
    );
  return Number(result.count);
}

export async function getBrandBranchLimit(brandId: string) {
  const brand = await db.query.brands.findFirst({
    where: eq(brands.id, brandId),
  });

  if (!brand) return 0;

  return brand.customMaxBranches ?? PLANS[brand.plan as PlanKey].max_branches;
}

export async function getBranchById(id: string) {
  return await db.query.branches.findFirst({
    where: and(eq(branches.id, id), isNull(branches.deletedAt)),
  });
}

export async function getOtherActiveBranches(brandId: string, currentBranchId: string) {
  return await db.query.branches.findMany({
    where: and(
      eq(branches.brandId, brandId),
      eq(branches.isActive, true),
      isNull(branches.deletedAt),
      ne(branches.id, currentBranchId)
    ),
  });
}
