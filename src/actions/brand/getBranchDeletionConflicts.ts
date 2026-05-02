"use server";

import { requireAuth } from "@/lib/auth";
import { getBranchDeletionConflicts as getConflicts, getOtherActiveBranches } from "@/lib/queries/branches";

export async function getBranchDeletionConflicts(branchId: string) {
  try {
    const { brandId } = await requireAuth(["brand_admin"]);
    if (!brandId) return { success: false, error: "Unauthorized" };

    const conflicts = await getConflicts(branchId);
    const otherBranches = await getOtherActiveBranches(brandId, branchId);

    return { 
      success: true, 
      assignedStaff: conflicts.assignedStaff,
      otherBranches: otherBranches.map(b => ({ id: b.id, name: b.name }))
    };
  } catch (error) {
    console.error("Error getting branch deletion conflicts:", error);
    return { success: false, error: "Failed to fetch conflicts" };
  }
}
