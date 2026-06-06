"use server";

import { db } from "@/lib/db";
import { brands, users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAuth, setBanForClerkUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import {
  type AccessDuration,
  durationToExpiry,
  isValidDuration,
} from "@/lib/accessDuration";

/**
 * Sets or extends a brand's access expiry. Master-admin only.
 *
 * `mode: "extend"` stacks the new duration on top of the brand's existing
 * expiry when it's still in the future — so paying for "3 months" of an
 * unexpired brand doesn't reset the timer and lose remaining days. If the
 * brand is already expired (or has never had an expiry), the new term
 * starts from now.
 *
 * `mode: "set"` always anchors at now.
 *
 * Re-activates the brand (and unbans its Clerk users) if it had been
 * suspended specifically because of expiry — the simplest signal is "we
 * just gave you access again", so we lift the suspension along with it.
 */
export async function setBrandAccessExpiry({
  brandId,
  duration,
  mode = "extend",
}: {
  brandId: string;
  duration: AccessDuration;
  mode?: "extend" | "set";
}) {
  try {
    await requireAuth(["master_admin"]);

    if (!isValidDuration(duration)) {
      return { success: false as const, error: "Invalid duration" };
    }

    const brand = await db.query.brands.findFirst({
      where: and(eq(brands.id, brandId), isNull(brands.deletedAt)),
      columns: { id: true, accessExpiresAt: true, isActive: true },
    });

    if (!brand) {
      return { success: false as const, error: "Brand not found" };
    }

    const now = new Date();
    const baseDate =
      mode === "extend" &&
      brand.accessExpiresAt &&
      brand.accessExpiresAt > now
        ? brand.accessExpiresAt
        : now;

    const newExpiry = durationToExpiry(duration, baseDate);

    // Whether the new term puts the brand back into the active window.
    const willBeActiveByExpiry = newExpiry === null || newExpiry > now;
    const shouldReactivate = !brand.isActive && willBeActiveByExpiry;

    await db
      .update(brands)
      .set({
        accessExpiresAt: newExpiry,
        ...(shouldReactivate ? { isActive: true } : {}),
        updatedAt: now,
      })
      .where(eq(brands.id, brandId));

    if (shouldReactivate) {
      // Mirror what setBrandStatus does: flip Clerk metadata + unban so the
      // brand's users can sign in again.
      const brandUsers = await db.query.users.findMany({
        where: and(eq(users.brandId, brandId), isNull(users.deletedAt)),
        columns: { clerkUserId: true },
      });

      const clerk = await clerkClient();
      await Promise.all(
        brandUsers
          .filter((u) => u.clerkUserId)
          .map((u) =>
            clerk.users.updateUserMetadata(u.clerkUserId!, {
              publicMetadata: { brandIsActive: true },
            })
          )
      );
      await Promise.all(
        brandUsers
          .filter((u) => u.clerkUserId)
          .map((u) => setBanForClerkUser(u.clerkUserId!, false))
      );
    }

    revalidatePath("/[adminSlug]/brands", "page");
    return {
      success: true as const,
      accessExpiresAt: newExpiry ? newExpiry.toISOString() : null,
    };
  } catch (error) {
    console.error("Error setting brand access expiry:", error);
    return { success: false as const, error: "Failed to update access expiry" };
  }
}
