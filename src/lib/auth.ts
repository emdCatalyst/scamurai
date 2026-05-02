import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export type UserRole = 'master_admin' | 'brand_admin' | 'finance' | 'staff';

/**
 * Helper to fetch a user from Clerk with exponential backoff retry.
 * Handles transient 429 (Rate Limit) and 5xx errors.
 */
async function getUserWithRetry(userId: string, retries = 3, delay = 500) {
  const client = await clerkClient();
  
  for (let i = 0; i < retries; i++) {
    try {
      return await client.users.getUser(userId);
    } catch (error: unknown) {
      const clerkError = error as { status?: number; name?: string; message?: string };
      const isTransient = 
        clerkError?.status === 429 || 
        (clerkError?.status && clerkError.status >= 500 && clerkError.status < 600) ||
        clerkError?.name === 'AbortError' ||
        clerkError?.message?.includes('fetch');

      if (!isTransient || i === retries - 1) {
        throw error;
      }

      console.warn(`[Auth] Clerk API transient error (attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, {
        status: clerkError?.status,
        message: clerkError?.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error('Clerk retry exhausted'); // Should not be reached due to throw in loop
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  let role = sessionClaims?.metadata?.role as UserRole;
  let brandId = sessionClaims?.metadata?.brandId as string | null;

  // Fallback to direct API if session claims are missing metadata
  if (!role) {
    console.warn(`[Auth] Metadata missing from session claims for user ${userId}. Falling back to Clerk API.`, {
      hasClaims: !!sessionClaims,
      claimsKeys: sessionClaims ? Object.keys(sessionClaims) : [],
      metadataKeys: sessionClaims?.metadata ? Object.keys(sessionClaims.metadata) : []
    });

    try {
      const user = await getUserWithRetry(userId);
      role = user.publicMetadata?.role as UserRole;
      brandId = user.publicMetadata?.brandId as string | null;

      if (!role) {
        console.error(`[Auth] User ${userId} fetched from API but still has no role in publicMetadata.`);
      }
    } catch (error: unknown) {
      const clerkError = error as { status?: number; message?: string; clerkError?: unknown };
      console.error(`[Auth] Critical failure fetching user ${userId} from Clerk API:`, {
        status: clerkError?.status,
        message: clerkError?.message,
        clerkError: clerkError?.clerkError
      });
      
      // If we're authorized by Clerk (userId exists) but the management API is failing,
      // and we don't have roles in the session, we can't safely proceed.
      // Redirect to a safe page instead of throwing/crashing.
      redirect('/');
    }
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    redirect('/');
  }

  return { userId, role, brandId };
}
