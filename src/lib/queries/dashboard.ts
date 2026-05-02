import { db } from "@/lib/db";
import { orders, branches, users, brands, brandDeliveryApps, deliveryAppCatalog } from "@/lib/db/schema";
import { eq, and, sql, gte, isNull, count, sum, desc } from "drizzle-orm";
import { PLANS, PlanKey } from "@/config/plans";

export async function getOrderStats(brandId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const todayRes = await db
    .select({ count: count() })
    .from(orders)
    .where(and(eq(orders.brandId, brandId), gte(orders.submittedAt, startOfToday), isNull(orders.deletedAt)))
    .execute();

  const needsReviewRes = await db
    .select({ count: count() })
    .from(orders)
    .where(and(eq(orders.brandId, brandId), eq(orders.status, "needs_review"), isNull(orders.deletedAt)))
    .execute();

  const monthlyRevenueRes = await db
    .select({ sum: sum(orders.subtotal) })
    .from(orders)
    .where(
      and(
        eq(orders.brandId, brandId),
        eq(orders.status, "approved"),
        gte(orders.submittedAt, startOfMonth),
        isNull(orders.deletedAt)
      )
    )
    .execute();

  return {
    todayCount: Number(todayRes[0]?.count || 0),
    needsReviewCount: Number(needsReviewRes[0]?.count || 0),
    monthlyRevenue: Number(monthlyRevenueRes[0]?.sum || 0),
  };
}

export async function getBranchStats(brandId: string) {
  const brand = await db.query.brands.findFirst({
    where: eq(brands.id, brandId),
    columns: { plan: true, customMaxBranches: true },
  });

  const branchCountRes = await db
    .select({ count: count() })
    .from(branches)
    .where(and(eq(branches.brandId, brandId), isNull(branches.deletedAt)))
    .execute();

  if (!brand) return { branchCount: 0, limit: 0 };

  const planLimit = PLANS[brand.plan as PlanKey]?.max_branches || 0;
  const limit = brand.customMaxBranches || planLimit;

  return {
    branchCount: Number(branchCountRes[0]?.count || 0),
    limit,
  };
}

export async function getOrdersOverTime(brandId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Group by date (UTC date to keep it simple and consistent)
  const result = await db
    .select({
      date: sql<string>`date_trunc('day', ${orders.submittedAt})`.as("date"),
      status: orders.status,
      count: count(),
    })
    .from(orders)
    .where(and(eq(orders.brandId, brandId), gte(orders.submittedAt, startDate), isNull(orders.deletedAt)))
    .groupBy(sql`date_trunc('day', ${orders.submittedAt})`, orders.status)
    .orderBy(sql`date_trunc('day', ${orders.submittedAt})`)
    .execute();

  // Process data into a format Recharts likes: { date: 'YYYY-MM-DD', submitted: 10, approved: 8, rejected: 2 }
  const dataMap: Record<string, { date: string; submitted: number; approved: number; rejected: number }> = {};

  result.forEach((row) => {
    const dateStr = new Date(row.date).toISOString().split("T")[0];
    if (!dataMap[dateStr]) {
      dataMap[dateStr] = { date: dateStr, submitted: 0, approved: 0, rejected: 0 };
    }
    const c = Number(row.count);
    dataMap[dateStr].submitted += c;
    if (row.status === "approved") dataMap[dateStr].approved += c;
    if (row.status === "rejected") dataMap[dateStr].rejected += c;
  });

  return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getOrdersByBranch(brandId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return await db
    .select({
      branchName: branches.name,
      count: count(orders.id),
    })
    .from(orders)
    .innerJoin(branches, eq(orders.branchId, branches.id))
    .where(and(eq(orders.brandId, brandId), gte(orders.submittedAt, startOfMonth), isNull(orders.deletedAt)))
    .groupBy(branches.name)
    .orderBy(desc(count(orders.id)))
    .execute();
}

export async function getOrdersByDeliveryApp(brandId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await db
    .select({
      appName: deliveryAppCatalog.name,
      count: count(orders.id),
    })
    .from(orders)
    .innerJoin(brandDeliveryApps, eq(orders.deliveryAppId, brandDeliveryApps.id))
    .innerJoin(deliveryAppCatalog, eq(brandDeliveryApps.catalogAppId, deliveryAppCatalog.id))
    .where(and(eq(orders.brandId, brandId), gte(orders.submittedAt, startOfMonth), isNull(orders.deletedAt)))
    .groupBy(deliveryAppCatalog.name)
    .orderBy(desc(count(orders.id)))
    .execute();

  return result.map((r) => ({ name: r.appName, value: Number(r.count) }));
}

export async function getTeamStats(brandId: string) {
  const result = await db
    .select({
      role: users.role,
      isActive: users.isActive,
      count: count(),
    })
    .from(users)
    .where(and(eq(users.brandId, brandId), isNull(users.deletedAt)))
    .groupBy(users.role, users.isActive)
    .execute();

  const stats: Record<string, { active: number; total: number }> = {
    brand_admin: { active: 0, total: 0 },
    finance: { active: 0, total: 0 },
    staff: { active: 0, total: 0 },
  };

  result.forEach((row) => {
    if (stats[row.role]) {
      const c = Number(row.count);
      stats[row.role].total += c;
      if (row.isActive) stats[row.role].active += c;
    }
  });

  return stats;
}
