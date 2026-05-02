"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/queries/users";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function handleBrandLoginRedirect(brandSlug: string) {
  console.log('[handleBrandLoginRedirect] 1. Action initiated for brand:', brandSlug);
  
  const { userId } = await auth();
  console.log('[handleBrandLoginRedirect] 2. Clerk Auth result, userId:', userId);

  if (!userId) {
    console.warn('[handleBrandLoginRedirect] No userId found in auth()');
    return { success: false, error: "Unauthorized" };
  }

  console.log('[handleBrandLoginRedirect] 3. Fetching user from DB...');
  const user = await getUserByClerkId(userId);
  console.log('[handleBrandLoginRedirect] 4. DB User fetch result:', user ? { email: user.email, role: user.role } : 'NOT_FOUND');

  if (!user) {
    console.error('[handleBrandLoginRedirect] User not found in DB for Clerk ID:', userId);
    return { success: false, error: "Account not found." };
  }

  // Set joinedAt on first login if it's null
  if (!user.joinedAt) {
    try {
      await db
        .update(users)
        .set({ joinedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));
      console.log(`[handleBrandLoginRedirect] Set joinedAt for user: ${user.email}`);
    } catch (err) {
      console.error(`[handleBrandLoginRedirect] Failed to set joinedAt for user: ${user.email}`, err);
    }
  }

  console.log('[handleBrandLoginRedirect] Found user:', {
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    brandId: user.brandId,
    brandSlug: user.brand?.slug
  });

  if (!user.isActive) {
    console.warn('[handleBrandLoginRedirect] USER_INACTIVE:', user.email);
    return { success: false, error: "inactive" };
  }

  // Check if brand exists (for non-master-admins)
  if (user.role !== 'master_admin' && !user.brand) {
    console.error('[handleBrandLoginRedirect] User has no brand assigned:', user.email);
    return { success: false, error: "noAccount" };
  }

  // Cross-brand guard: verify user belongs to the brand they are trying to login to
  if (user.role !== 'master_admin' && user.brand?.slug !== brandSlug) {
    console.warn('[handleBrandLoginRedirect] Brand mismatch:', {
      userBrand: user.brand?.slug,
      requestedBrand: brandSlug
    });
    return { success: false, error: "noAccount" };
  }

  // Check if brand is active
  if (user.role !== 'master_admin' && user.brand && !user.brand.isActive) {
    console.warn('[handleBrandLoginRedirect] BRAND_SUSPENDED:', user.brand.name);
    return { success: false, error: "suspended" };
  }

  // Check if user must change password (brand users logging in for the first time)
  if (user.role !== 'master_admin') {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    if (clerkUser.publicMetadata?.mustChangePassword === true) {
      console.log('[handleBrandLoginRedirect] User must change password, redirecting to change-password.');
      return { success: true, target: `/brands/${brandSlug}/change-password` };
    }
  }

  // Determine redirect based on role
  let target = `/brands/${brandSlug}/dashboard`;

  console.log('Login redirect check for user:', user.email, 'Role:', user.role);

  switch (user.role) {
    case "master_admin":
      // For master admin, redirect to their main brand management view
      target = "/brands"; 
      break;
    case "brand_admin":
      if (!user.onboardingComplete) {
        target = `/onboarding/brand-setup`;
      }
      break;
    case "finance":
      target = `/brands/${brandSlug}/orders`;
      break;
    case "staff":
      target = `/brands/${brandSlug}/submit`;
      break;
    default:
      console.warn('Unknown role encountered for redirect:', user.role);
      target = "/";
  }

  console.log('Redirecting user to:', target);
  return { success: true, target };
}
