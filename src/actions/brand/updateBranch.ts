"use server";

import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateBranch({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  try {
    // 1. requireAuth(['brand_admin'])
    const { brandId } = await requireAuth(["brand_admin"]);

    if (!brandId) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Verify ownership
    const branch = await db.query.branches.findFirst({
      where: and(eq(branches.id, id), eq(branches.brandId, brandId), isNull(branches.deletedAt)),
    });

    if (!branch) {
      return { success: false, error: "Branch not found" };
    }

    // 3. Validate name uniqueness (excluding current branch)
    const existing = await db.query.branches.findFirst({
      where: and(
        eq(branches.brandId, brandId),
        eq(branches.name, name),
        ne(branches.id, id),
        isNull(branches.deletedAt)
      ),
    });

    if (existing) {
      return { success: false, error: "A branch with this name already exists" };
    }

    // 4. UPDATE branches SET name, updated_at
    await db
      .update(branches)
      .set({
        name,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id));

    revalidatePath("/[locale]/brands/[brandSlug]/branches", "page");
    return { success: true };
  } catch (error) {
    console.error("Error updating branch:", error);
    return { success: false, error: "Failed to update branch" };
  }
}
