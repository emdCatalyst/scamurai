'use server';

import { eq, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { applications, brands, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';

export type ApproveApplicationResult =
  | { success: true }
  | { success: false; error: string };

export async function approveApplication(
  applicationId: string,
  customMaxBranches?: number,
  customMaxUsers?: number
): Promise<ApproveApplicationResult> {
  // Protected: master_admin only
  await requireAuth(['master_admin']);

  // Fetch the application
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!application) {
    return { success: false, error: 'Application not found.' };
  }

  if (application.status !== 'quoted') {
    return { success: false, error: 'Application must be in "quoted" status before approval.' };
  }

  // Check if a user with this email already exists to prevent unique constraint violation
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, application.contactEmail))
    .limit(1);

  if (existingUser) {
    return { success: false, error: `A user with email ${application.contactEmail} already exists in the system.` };
  }

  // Generate base slug from brand name
  const baseSlug = application.brandName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  try {
    const brandId = await db.transaction(async (tx) => {
      // Slug collision handling
      let slug = baseSlug;
      let counter = 1;
      let isUnique = false;

      while (!isUnique) {
        const [existingBrand] = await tx
          .select({ id: brands.id })
          .from(brands)
          .where(eq(brands.slug, slug))
          .limit(1);

        if (!existingBrand) {
          isUnique = true;
        } else {
          counter++;
          slug = `${baseSlug}-${counter}`;
        }
      }

      // Check brand name uniqueness
      const [existingBrandName] = await tx
        .select({ id: brands.id })
        .from(brands)
        .where(ilike(brands.name, application.brandName))
        .limit(1);
      
      if (existingBrandName) {
        throw new Error(`A brand named "${application.brandName}" already exists.`);
      }

      // 1. Create brand
      const [brand] = await tx
        .insert(brands)
        .values({
          name: application.brandName,
          slug,
          plan: application.plan,
          customMaxBranches: customMaxBranches ?? null,
          customMaxUsers: customMaxUsers ?? null,
        })
        .returning({ id: brands.id });

      // 2. Create user row
      await tx
        .insert(users)
        .values({
          email: application.contactEmail,
          fullName: application.brandName, // Fallback to brand name for now
          role: 'brand_admin',
          brandId: brand.id,
          isActive: true,
          onboardingComplete: false,
        });

      // 3. Update application status
      await tx
        .update(applications)
        .set({
          status: 'approved',
          brandId: brand.id,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, applicationId));

      return brand.id;
    });

    // 4. Outside transaction: Send Clerk invite
    try {
      const clerk = await clerkClient();
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
      const redirectUrl = `${baseUrl}/en/onboarding/brand-setup`;
      
      console.log(`[approveApplication] Sending Clerk invite to ${application.contactEmail} with redirect ${redirectUrl}`);
      
      await clerk.invitations.createInvitation({
        emailAddress: application.contactEmail,
        redirectUrl,
        publicMetadata: {
          role: 'brand_admin',
          brandId: brandId,
          userIsActive: true,
          brandIsActive: true,
        },
      });
      console.log(`[approveApplication] Clerk invite sent successfully.`);
    } catch (clerkErr: any) {
      console.error('[approveApplication] Clerk invitation failed:', clerkErr);
      if (clerkErr.errors) {
        console.error('[approveApplication] Clerk API Errors:', JSON.stringify(clerkErr.errors, null, 2));
      }
      // We don't return failure here if DB is done, but maybe toast warning? 
      // For now, let's just log it. The brand is created.
    }

    return { success: true };
  } catch (err: any) {
    console.error('[approveApplication] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to approve application.',
    };
  }
}
