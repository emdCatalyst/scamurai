import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export type UserRole = 'master_admin' | 'brand_admin' | 'finance' | 'staff';

export async function requireAuth(allowedRoles?: UserRole[]) {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');

  let role = sessionClaims?.metadata?.role as UserRole;
  let brandId = sessionClaims?.metadata?.brandId as string | null;

  // Fallback to direct API if session claims are missing metadata
  // This happens if Clerk is not configured to include publicMetadata in JWT
  if (!role && userId) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    role = user.publicMetadata?.role as UserRole;
    brandId = user.publicMetadata?.brandId as string | null;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    redirect('/');
  }

  return { userId, role, brandId };
}
