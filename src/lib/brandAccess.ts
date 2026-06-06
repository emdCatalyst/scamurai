/**
 * Helpers for enforcing brand-access expiry on every authenticated brand
 * page load — see src/app/[locale]/brands/[brandSlug]/(authenticated)/layout.tsx
 *
 * The brand row itself carries `accessExpiresAt`. We lazy-flip the brand to
 * inactive (and revoke its users' Clerk sessions) the first time we see it
 * crossed midnight on expiry. No cron required, and the system is
 * self-healing if the cron is ever set up later.
 */

import "server-only";
import { db } from "@/lib/db";
import { brands, users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { revokeAllSessionsForUser, setBanForClerkUser } from "@/lib/auth";

export function isBrandExpired(
  accessExpiresAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!accessExpiresAt) return false; // NULL = lifetime access
  const expiry =
    typeof accessExpiresAt === "string"
      ? new Date(accessExpiresAt)
      : accessExpiresAt;
  return expiry.getTime() <= now.getTime();
}

/**
 * Flips the brand inactive in the DB, propagates `brandIsActive: false` to
 * every brand user's Clerk metadata, and revokes their active sessions.
 * Idempotent — safe to call from a per-request hot path because the DB
 * update is a no-op when the row is already inactive.
 *
 * Returns `true` if a state change actually happened, so the caller can
 * decide whether to log / toast / etc.
 */
export async function flipBrandToExpired(brandId: string): Promise<boolean> {
  // Capture the prior state so we can short-circuit when nothing changes.
  const brand = await db.query.brands.findFirst({
    where: and(eq(brands.id, brandId), isNull(brands.deletedAt)),
    columns: { id: true, isActive: true },
  });
  if (!brand) return false;
  if (!brand.isActive) return false;

  await db
    .update(brands)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(brands.id, brandId));

  const brandUsers = await db.query.users.findMany({
    where: and(eq(users.brandId, brandId), isNull(users.deletedAt)),
    columns: { clerkUserId: true },
  });

  const clerk = await clerkClient();
  await Promise.all(
    brandUsers
      .filter((u) => u.clerkUserId)
      .map((u) =>
        clerk.users
          .updateUserMetadata(u.clerkUserId!, {
            publicMetadata: { brandIsActive: false },
          })
          .catch((err) => {
            console.warn(
              `[brandAccess] Clerk metadata update failed for ${u.clerkUserId}:`,
              err
            );
          })
      )
  );

  // Boot existing sessions so users land on /suspended on their next click
  // instead of riding a stale JWT for another 60s.
  await Promise.all(
    brandUsers
      .filter((u) => u.clerkUserId)
      .map((u) => revokeAllSessionsForUser(u.clerkUserId!))
  );

  // Ban at the Clerk level so a refresh re-auth also bounces. Matches the
  // suspension behavior in setBrandStatus.
  await Promise.all(
    brandUsers
      .filter((u) => u.clerkUserId)
      .map((u) => setBanForClerkUser(u.clerkUserId!, true))
  );

  console.log(`[brandAccess] Brand ${brandId} flipped to expired/inactive.`);
  return true;
}
