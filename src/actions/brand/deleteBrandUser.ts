"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteBrandUser({ userId }: { userId: string }) {
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
      try {
        await client.users.deleteUser(user.clerkUserId);
      } catch (e) {
        console.error("Clerk user deletion failed:", e);
        // Continue to soft-delete in DB even if clerk fails (e.g. user already deleted in clerk)
      }
    }

    await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/[locale]/brands/[brandSlug]/(authenticated)/users", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting brand user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
