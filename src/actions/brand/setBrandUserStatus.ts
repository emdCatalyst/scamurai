"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function setBrandUserStatus({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  try {
    const { brandId } = await requireAuth(["brand_admin"]);
    if (!brandId) return { success: false, error: "Unauthorized" };

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.brandId, brandId), isNull(users.deletedAt)),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const client = await clerkClient();

    if (user.clerkUserId) {
      await client.users.updateUserMetadata(user.clerkUserId, {
        publicMetadata: {
          userIsActive: isActive,
        },
      });
    }

    await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/[locale]/brands/[brandSlug]/(authenticated)/users", "page");
    return { success: true };
  } catch (error) {
    console.error("Error toggling brand user status:", error);
    return { success: false, error: "Failed to update user status" };
  }
}
