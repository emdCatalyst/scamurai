"use server";

import { db } from "@/lib/db";
import { branches, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { clerkClient as getClerkClient } from "@clerk/nextjs/server";

export type StaffResolution = {
  staffId: string;
  resolution: "reassign" | "deactivate";
  newBranchId?: string;
};

export async function deleteBranch({
  branchId,
  staffResolutions = [],
}: {
  branchId: string;
  staffResolutions?: StaffResolution[];
}) {
  try {
    // 1. requireAuth(['brand_admin'])
    const { brandId: authBrandId } = await requireAuth(["brand_admin"]);

    if (!authBrandId) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Verify ownership
    const branch = await db.query.branches.findFirst({
      where: and(
        eq(branches.id, branchId),
        eq(branches.brandId, authBrandId),
        isNull(branches.deletedAt)
      ),
    });

    if (!branch) {
      return { success: false, error: "Branch not found" };
    }

    // 3. Re-fetch assigned staff to validate conflicts
    const currentStaff = await db
      .select()
      .from(users)
      .where(and(eq(users.branchId, branchId), isNull(users.deletedAt)));

    if (currentStaff.length > 0) {
      // Ensure all staff have a resolution
      const resolvedIds = new Set(staffResolutions.map((r) => r.staffId));
      for (const s of currentStaff) {
        if (!resolvedIds.has(s.id)) {
          return {
            success: false,
            error: `Staff member ${s.fullName} is not resolved`,
          };
        }
      }
    }

    // 4. db.transaction()
    await db.transaction(async (tx) => {
      const clerk = await getClerkClient();

      for (const res of staffResolutions) {
        const user = currentStaff.find((s) => s.id === res.staffId);
        if (!user) continue;

        if (res.resolution === "reassign" && res.newBranchId) {
          // UPDATE users SET branch_id = newBranchId, updated_at = now()
          await tx
            .update(users)
            .set({
              branchId: res.newBranchId,
              updatedAt: new Date(),
            })
            .where(eq(users.id, res.staffId));

          // UPDATE Clerk publicMetadata.branchId = newBranchId
          if (user.clerkUserId) {
            await clerk.users.updateUserMetadata(user.clerkUserId, {
              publicMetadata: {
                branchId: res.newBranchId,
              },
            });
          }
        } else if (res.resolution === "deactivate") {
          // UPDATE users SET is_active = false, updated_at = now()
          await tx
            .update(users)
            .set({
              isActive: false,
              updatedAt: new Date(),
            })
            .where(eq(users.id, res.staffId));

          // clerkClient.users.banUser(clerk_user_id)
          if (user.clerkUserId) {
            await clerk.users.banUser(user.clerkUserId);
          }
        }
      }

      // UPDATE branches SET deleted_at = now(), updated_at = now()
      await tx
        .update(branches)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(branches.id, branchId));
    });

    revalidatePath("/[locale]/brands/[brandSlug]/branches", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting branch:", error);
    return { success: false, error: "Failed to delete branch" };
  }
}
