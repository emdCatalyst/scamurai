'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export async function verifyAdminRole() {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated.' };

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  if (user.publicMetadata?.role !== 'master_admin') {
    return { success: false, error: 'Access denied.' };
  }

  return { success: true };
}
