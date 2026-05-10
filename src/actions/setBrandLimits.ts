"use server";

import { db } from "@/lib/db";
import { brands, branches, users } from "@/lib/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PLANS, type PlanKey } from "@/config/plans";

const PLAN_KEYS = Object.keys(PLANS) as [PlanKey, ...PlanKey[]];

// `null` clears the override (revert to plan default). `undefined` leaves
// the existing value untouched.
const setBrandLimitsSchema = z.object({
  brandId: z.string().uuid(),
  plan: z.enum(PLAN_KEYS).optional(),
  customMaxBranches: z.number().int().min(1).max(10000).nullable().optional(),
  customMaxUsers: z.number().int().min(1).max(10000).nullable().optional(),
});

export type SetBrandLimitsInput = z.infer<typeof setBrandLimitsSchema>;

export async function setBrandLimits(input: SetBrandLimitsInput) {
  try {
    await requireAuth(["master_admin"]);

    const parsed = setBrandLimitsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const { brandId, plan, customMaxBranches, customMaxUsers } = parsed.data;

    if (
      plan === undefined &&
      customMaxBranches === undefined &&
      customMaxUsers === undefined
    ) {
      return { success: false as const, error: "No changes to apply" };
    }

    const brand = await db.query.brands.findFirst({
      where: and(eq(brands.id, brandId), isNull(brands.deletedAt)),
    });
    if (!brand) {
      return { success: false as const, error: "Brand not found" };
    }

    // Resolve the *new* effective limits so we can validate against current usage.
    const nextPlanKey = (plan ?? brand.plan) as PlanKey;
    const planConfig = PLANS[nextPlanKey];
    if (!planConfig) {
      return { success: false as const, error: "Unknown plan" };
    }

    const nextCustomBranches =
      customMaxBranches === undefined
        ? brand.customMaxBranches
        : customMaxBranches;
    const nextCustomUsers =
      customMaxUsers === undefined ? brand.customMaxUsers : customMaxUsers;

    const effectiveBranchLimit = nextCustomBranches ?? planConfig.max_branches;
    const effectiveUserLimit = nextCustomUsers ?? planConfig.max_users;

    // Current usage — we refuse to set a limit that would put the brand
    // already over quota, since the brand admin would be stuck unable to
    // delete to recover.
    const [[{ branchCount }], [{ userCount }]] = await Promise.all([
      db
        .select({ branchCount: count() })
        .from(branches)
        .where(
          and(eq(branches.brandId, brandId), isNull(branches.deletedAt))
        ),
      db
        .select({ userCount: count() })
        .from(users)
        .where(and(eq(users.brandId, brandId), isNull(users.deletedAt))),
    ]);

    const currentBranches = Number(branchCount);
    const currentUsers = Number(userCount);

    if (effectiveBranchLimit < currentBranches) {
      return {
        success: false as const,
        error: `Branch limit (${effectiveBranchLimit}) is below the current branch count (${currentBranches}). Remove branches first.`,
      };
    }
    if (effectiveUserLimit < currentUsers) {
      return {
        success: false as const,
        error: `User limit (${effectiveUserLimit}) is below the current user count (${currentUsers}). Remove users first.`,
      };
    }

    await db
      .update(brands)
      .set({
        ...(plan !== undefined ? { plan } : {}),
        ...(customMaxBranches !== undefined
          ? { customMaxBranches }
          : {}),
        ...(customMaxUsers !== undefined ? { customMaxUsers } : {}),
        updatedAt: new Date(),
      })
      .where(eq(brands.id, brandId));

    revalidatePath("/[adminSlug]/brands", "page");

    return {
      success: true as const,
      effectiveBranchLimit,
      effectiveUserLimit,
    };
  } catch (error) {
    console.error("[setBrandLimits] error:", error);
    return { success: false as const, error: "Failed to update brand limits" };
  }
}
