'use server';

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, brands } from "@/lib/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { accountDetailsSchema } from "@/lib/validations/brandSettings";

export async function updateBrandAdminAccount(data: {
  fullName: string;
  email: string;
}) {
  const { userId, brandId } = await requireAuth(["brand_admin"]);
  if (!userId || !brandId) return { success: false, error: "Unauthorized" };

  const parsed = accountDetailsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { fullName, email } = parsed.data;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
    });
    if (!user) return { success: false, error: "User not found" };

    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, brandId),
    });

    const emailChanged = user.email !== email;

    // Block taking an email that's already in use by another (non-deleted) user.
    if (emailChanged) {
      const conflicting = await db.query.users.findFirst({
        where: and(
          eq(users.email, email),
          ne(users.id, user.id),
          isNull(users.deletedAt)
        ),
        columns: { id: true },
      });
      if (conflicting) {
        return {
          success: false,
          error: "That email is already in use by another account.",
        };
      }
    }

    const client = await clerkClient();

    // 1. Sync email to Clerk (create new address, mark primary + verified,
    //    then drop the previous addresses so the user has a clean record).
    if (emailChanged && user.clerkUserId) {
      try {
        const clerkUser = await client.users.getUser(user.clerkUserId);
        const previousEmailIds = clerkUser.emailAddresses.map((e) => e.id);

        await client.emailAddresses.createEmailAddress({
          userId: user.clerkUserId,
          emailAddress: email,
          verified: true,
          primary: true,
        });

        // Best-effort cleanup of stale addresses — don't fail the whole action
        // if Clerk refuses to delete one.
        await Promise.all(
          previousEmailIds.map((id) =>
            client.emailAddresses
              .deleteEmailAddress(id)
              .catch((err) =>
                console.warn(
                  `[updateBrandAdminAccount] couldn't delete old email ${id}:`,
                  err
                )
              )
          )
        );
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

    // 2. Sync display name to Clerk so the rest of the app and the Clerk
    //    avatar/menu show the new name.
    if (user.clerkUserId && user.fullName !== fullName) {
      try {
        await client.users.updateUser(user.clerkUserId, {
          firstName: fullName.split(" ")[0],
          lastName: fullName.split(" ").slice(1).join(" ") || undefined,
        });
      } catch (e) {
        console.error("Clerk name update failed:", e);
        // Don't fail the whole action — DB is the source of truth for display
        // in this app; the Clerk name is secondary.
      }
    }

    // 3. Update DB.
    await db
      .update(users)
      .set({
        fullName,
        email,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userId));

    if (brand) {
      revalidatePath(`/brands/${brand.slug}/settings`);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update brand admin account:", error);
    const clerkError = error as {
      clerkError?: boolean;
      errors?: { message: string }[];
    };
    if (clerkError?.clerkError && clerkError?.errors?.[0]?.message) {
      return { success: false, error: clerkError.errors[0].message };
    }
    return { success: false, error: "Failed to update account details" };
  }
}
