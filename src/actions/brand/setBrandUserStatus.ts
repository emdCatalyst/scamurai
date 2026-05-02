"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth, revokeAllSessionsForUser, setBanForClerkUser } from "@/lib/auth";
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

      // On deactivation, kill active sessions so the user is bounced to login
      // immediately (not just on JWT refresh ~60s later).
      if (!isActive) {
        await revokeAllSessionsForUser(user.clerkUserId);
      }

      // Ban (deactivate) or unban (reactivate) at the Clerk level so the user
      // can't establish a fresh session through the login form during the
      // suspension. Without this, signIn.create() succeeds and middleware
      // only redirects after a session cookie is already issued.
      await setBanForClerkUser(user.clerkUserId, !isActive);
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
