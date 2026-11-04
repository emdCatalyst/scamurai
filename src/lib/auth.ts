import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { ORDER_ERROR_STATUS, type OrderErrorBody, type OrderErrorCode } from '@/lib/orders/errors';

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

type Session = { userId: string; role: UserRole; brandId: string | null };

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
 *
 * Returns null when signed out, and 'unavailable' when the role is only in
 * Clerk's API and that call failed.
 */
async function readSession(): Promise<Session | null | 'unavailable'> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
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
      return 'unavailable';
    }
  }

  return { userId, role, brandId };
}

/** Page guard: redirects to sign-in when signed out, and home for any other refusal. */
export async function requireAuth(allowedRoles?: readonly UserRole[]) {
  const session = await readSession();

  if (session === null) {
    redirect('/sign-in');
  }

  // Clerk's API failed: redirect to a safe page instead of throwing/crashing.
  if (session === 'unavailable' || (allowedRoles && !allowedRoles.includes(session.role))) {
    redirect('/');
  }

  return session;
}

/** Who may submit orders: the order APIs, and the order screen that sends to them. */
export const ORDER_SUBMITTER_ROLES: readonly UserRole[] = ['staff'];

const apiRefusal = (code: OrderErrorCode, error: string) =>
  Response.json({ error, code } satisfies OrderErrorBody, { status: ORDER_ERROR_STATUS[code] });

/**
 * requireAuth for route handlers: the session, or a JSON answer to return as
 * is. A redirect thrown inside a handler's try/catch became a 500, which
 * phones retry forever; here a wrong role is a 403 they stop at.
 */
export async function requireApiAuth(allowedRoles: readonly UserRole[]): Promise<Session | Response> {
  const session = await readSession();
  if (session === null) return apiRefusal('unauthenticated', 'Not signed in');
  if (session === 'unavailable') return apiRefusal('server_error', 'Could not check the session');
  if (!allowedRoles.includes(session.role)) return apiRefusal('forbidden', 'Not allowed for this account');
  return session;
}

/**
 * Page-level guard for the master-admin console.
 *
 * Layouts are not a security boundary in the App Router: an RSC request whose
 * router-state header already lists the parent segments renders the page
 * WITHOUT running the layouts above it. Every admin page must therefore call
 * this before reading any data. It answers with notFound() rather than a
 * redirect, so outsiders can't confirm the secret admin path exists.
 */
export async function requireMasterAdminPage(adminSlug: string): Promise<void> {
  const expectedSlug = process.env.ADMIN_SLUG;
  if (!expectedSlug || adminSlug !== expectedSlug) notFound();

  const { userId, sessionClaims } = await auth();
  if (!userId) notFound();

  let role = sessionClaims?.metadata?.role;
  if (!role) {
    const user = await currentUser();
    role = user?.publicMetadata?.role as UserRole | undefined;
  }
  if (role !== 'master_admin') notFound();
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
