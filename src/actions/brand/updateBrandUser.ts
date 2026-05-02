"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { brandUserSchema } from "@/lib/validations/brandUser";

export async function updateBrandUser(
  userId: string,
  data: {
    fullName: string;
    email: string;
    role: "finance" | "staff";
    branchId?: string | null;
  }
) {
  try {
    const { brandId } = await requireAuth(["brand_admin"]);
    if (!brandId) return { success: false, error: "Unauthorized" };

    const parsed = brandUserSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { fullName, email, role } = parsed.data;
    const branchId = parsed.data.branchId;

    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.brandId, brandId), isNull(users.deletedAt)),
    });

    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    const client = await clerkClient();

    // If email changed, update Clerk
    if (email !== existingUser.email && existingUser.clerkUserId) {
      try {
        await client.emailAddresses.createEmailAddress({
          userId: existingUser.clerkUserId,
          emailAddress: email,
          verified: true,
          primary: true,
        });
        // We might want to delete the old one, but keeping it simple for now
      } catch (e) {
        console.error("Clerk email update failed:", e);
        const clerkErr = e as { errors?: { longMessage?: string }[] };
        return {
          success: false,
          error:
            clerkErr.errors?.[0]?.longMessage ||
            "Failed to update email in authentication provider",
        };
      }
    }

    // Update Clerk Metadata & Name
    if (existingUser.clerkUserId) {
      try {
        await client.users.updateUser(existingUser.clerkUserId, {
          firstName: fullName.split(" ")[0],
          lastName: fullName.split(" ").slice(1).join(" ") || undefined,
        });

        await client.users.updateUserMetadata(existingUser.clerkUserId, {
          publicMetadata: {
            role,
            brandId,
            branchId: branchId || null,
          },
        });
      } catch (e) {
        console.error("Clerk metadata update failed:", e);
        return { success: false, error: "Failed to update authentication metadata" };
      }
    }

    // Update DB
    await db
      .update(users)
      .set({
        fullName,
        email,
        role,
        branchId: branchId || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/[locale]/brands/[brandSlug]/(authenticated)/users", "page");
    return { success: true };
  } catch (error) {
    console.error("Error updating brand user:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
