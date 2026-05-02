"use server";

import { requireAuth } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function clearMustChangePassword() {
  try {
    const { userId } = await requireAuth(["brand_admin", "finance", "staff"]);
    if (!userId) return { success: false, error: "Unauthorized" };

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        mustChangePassword: false,
      },
    });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { joinedAt: true }
    });

    if (dbUser && !dbUser.joinedAt) {
      await db
        .update(users)
        .set({ 
          joinedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, userId));
    }

    return { success: true };
  } catch (error) {
    console.error("Error clearing mustChangePassword:", error);
    return { success: false, error: "Failed to update authentication metadata" };
  }
}
