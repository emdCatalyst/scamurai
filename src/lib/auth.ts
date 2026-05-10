import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export type UserRole = 'master_admin' | 'brand_admin' | 'finance' | 'staff';

// Tracks whether we've already warned about missing metadata claims in this
// server process. Without this, requireAuth spams the console once per
// request whenever Clerk's session token isn't configured to include
// `metadata` — see the docstring on requireAuth for the dashboard fix.
let metadataClaimWarningEmitted = false;

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

/**
 * Resolves the current user's role + brandId, preferring fast session-claim
 * lookup with a Clerk API fallback.
 *
 * For best performance, configure Clerk's session token to include the
 * user's public metadata (Clerk Dashboard → Sessions → Customize session
 * token):
 *
 *   {
 *     "metadata": "{{user.public_metadata}}",
 *     "email": "{{user.primary_email_address}}",
 *     "image": "{{user.image_url}}"
 *   }
 *
 * Without that, every request hits Clerk's API for the user record and we
 * emit a one-time warning on server start.
 */
export async function requireAuth(allowedRoles?: UserRole[]) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  let role = sessionClaims?.metadata?.role as UserRole;
  let brandId = sessionClaims?.metadata?.brandId as string | null;

  // Fallback to direct API if session claims are missing metadata
  if (!role) {
    if (!metadataClaimWarningEmitted) {
      metadataClaimWarningEmitted = true;
      console.warn(
        '[Auth] Session token does not include `metadata` claims; falling back to Clerk API on every authenticated request. ' +
          'Fix by adding `"metadata": "{{user.public_metadata}}"` to the Clerk session-token template ' +
          '(Dashboard → Sessions → Customize session token). This warning will only print once per server process.'
      );
    }

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

/**
 * Terminates every active Clerk session for a user. Use after password resets,
 * user deactivation, or brand suspension to force a full re-auth on the next
 * request — instead of relying on middleware to bounce a still-valid session.
 *
 * Failures are logged and swallowed. The caller's primary action (DB update,
 * metadata flip) should not fail just because session revocation didn't fully
 * succeed; middleware will catch the user on next request via metadata anyway.
 */
export async function revokeAllSessionsForUser(clerkUserId: string): Promise<void> {
  try {
    const client = await clerkClient();
    const { data: sessions } = await client.sessions.getSessionList({
      userId: clerkUserId,
      status: 'active',
    });
    if (sessions.length === 0) return;

    await Promise.all(
      sessions.map((s) =>
        client.sessions.revokeSession(s.id).catch((err) => {
          console.warn(
            `[Auth] revokeSession failed for ${s.id} (user ${clerkUserId}):`,
            err
          );
        })
      )
    );
  } catch (err) {
    console.error(
      `[Auth] revokeAllSessionsForUser failed for ${clerkUserId}:`,
      err
    );
  }
}

/**
 * Bans (or unbans) a Clerk user. A banned user is rejected by Clerk during
 * `signIn.create()` before any session is issued — use this alongside session
 * revocation to fully prevent access until the admin reactivates them.
 *
 * Pair calls: ban on deactivate/suspend, unban on activate/reinstate.
 *
 * Failures are logged and swallowed; the metadata-based middleware redirect
 * remains as a fallback.
 */
export async function setBanForClerkUser(
  clerkUserId: string,
  banned: boolean
): Promise<void> {
  try {
    const client = await clerkClient();
    if (banned) {
      await client.users.banUser(clerkUserId);
    } else {
      await client.users.unbanUser(clerkUserId);
    }
  } catch (err) {
    console.error(
      `[Auth] setBanForClerkUser(${clerkUserId}, banned=${banned}) failed:`,
      err
    );
  }
}
