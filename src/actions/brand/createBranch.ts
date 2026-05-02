"use server";

import { db } from "@/lib/db";
import { branches, brands } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { countAllBranches, getBrandBranchLimit } from "@/lib/queries/branches";
import { revalidatePath } from "next/cache";

export async function createBranch({
  name,
}: {
  name: string;
}) {
  try {
    // 1. requireAuth(['brand_admin'])
    const { brandId } = await requireAuth(["brand_admin"]);

    if (!brandId) {
      return { success: false, error: "Unauthorized: No brand associated" };
    }

    // 2. Re-check plan limit
    const branchCount = await countAllBranches(brandId);
    const limit = await getBrandBranchLimit(brandId);

    if (branchCount >= limit) {
      return { success: false, error: "plan_limit", limit };
    }

    // 3. Validate name uniqueness within the brand
    const existing = await db.query.branches.findFirst({
      where: and(
        eq(branches.brandId, brandId),
        eq(branches.name, name),
        isNull(branches.deletedAt)
      ),
    });

    if (existing) {
      return { success: false, error: "A branch with this name already exists" };
    }

    // 4. INSERT INTO branches (brand_id, name)
    await db.insert(branches).values({
      brandId,
      name,
    });

    revalidatePath("/[locale]/brands/[brandSlug]/branches", "page");
    return { success: true };
  } catch (error) {
    console.error("Error creating branch:", error);
    return { success: false, error: "Failed to create branch" };
  }
}
