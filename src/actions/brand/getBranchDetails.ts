"use server";

import { db } from "@/lib/db";
import { branches, users, orders } from "@/lib/db/schema";
import { eq, and, isNull, count, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function getBranchDetails(branchId: string) {
  try {
    const { brandId: authBrandId } = await requireAuth(["brand_admin"]);
    if (!authBrandId) return { success: false, error: "Unauthorized" };

    // 1. Verify ownership & Get branch basic info
    const branch = await db.query.branches.findFirst({
      where: and(eq(branches.id, branchId), eq(branches.brandId, authBrandId), isNull(branches.deletedAt)),
    });

    if (!branch) return { success: false, error: "Branch not found" };

    // 2. Get Assigned Staff
    const staff = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      isActive: users.isActive,
    }).from(users).where(and(eq(users.branchId, branchId), isNull(users.deletedAt)));

    // 3. Get Order Stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [stats] = await db.select({
      totalOrders: count(orders.id),
      ordersThisMonth: sql<number>`count(${orders.id}) FILTER (WHERE ${orders.submittedAt} >= ${startOfMonth.toISOString()})`
    }).from(orders).where(and(eq(orders.branchId, branchId), isNull(orders.deletedAt)));

    return {
      success: true,
      branch,
      staff,
      stats: {
        totalOrders: Number(stats.totalOrders),
        ordersThisMonth: Number(stats.ordersThisMonth || 0),
      }
    };
  } catch (error) {
    console.error("Error getting branch details:", error);
    return { success: false, error: "Failed to fetch details" };
  }
}
