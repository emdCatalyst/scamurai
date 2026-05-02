"use server";

import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function setBranchStatus({
  branchId,
  isActive,
}: {
  branchId: string;
  isActive: boolean;
}) {
  try {
    // 1. requireAuth(['brand_admin'])
    const { brandId: authBrandId } = await requireAuth(["brand_admin"]);

    if (!authBrandId) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Verify ownership
    const branch = await db.query.branches.findFirst({
      where: and(eq(branches.id, branchId), eq(branches.brandId, authBrandId), isNull(branches.deletedAt)),
    });

    if (!branch) {
      return { success: false, error: "Branch not found" };
    }

    // 3. UPDATE branches SET is_active, updated_at
    await db
      .update(branches)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, branchId));

    revalidatePath("/[locale]/brands/[brandSlug]/branches", "page");
    return { success: true };
  } catch (error) {
    console.error("Error setting branch status:", error);
    return { success: false, error: "Failed to update branch status" };
  }
}
