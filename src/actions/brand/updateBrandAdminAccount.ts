'use server';

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { accountDetailsSchema } from "@/lib/validations/brandSettings";
import { clerkClient } from "@clerk/nextjs/server";

export async function updateBrandAdminAccount(data: {
  fullName: string;
  email: string;
}) {
  const { userId, brandId } = await requireAuth(["brand_admin"]);
  if (!userId || !brandId) return { success: false, error: "Unauthorized" };

  const parsed = accountDetailsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
    });

    if (!user) return { success: false, error: "User not found" };

    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, brandId),
    });

    // 1. Update Clerk if email changed
    if (user.email !== data.email && user.clerkUserId) {
      const client = await clerkClient();
      await client.users.updateUser(user.clerkUserId, {
        emailAddress: [data.email],
      });
      // Note: Clerk will handle sending verification if configured.
    }

    // 2. Update DB
    await db
      .update(users)
      .set({
        fullName: data.fullName,
        email: data.email,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userId));

    if (brand) {
      revalidatePath(`/brands/${brand.slug}/settings`);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update brand admin account:", error);
    
    const clerkError = error as { clerkError?: boolean; errors?: { message: string }[] };

    // Check for Clerk-specific errors
    if (clerkError?.clerkError && clerkError?.errors?.[0]?.message) {
      return { success: false, error: clerkError.errors[0].message };
    }

    return { success: false, error: "Failed to update account details" };
  }
}
