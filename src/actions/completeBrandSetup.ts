'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brands, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth';

export type BrandColors = {
  primary: string;
  background: string;
  surface: string;
  textAccent: string;
};

import { brandSetupSchema } from '@/lib/validations/brandSetup';

export type CompleteBrandSetupResult =
  | { success: true }
  | { success: false; error: string };

export async function completeBrandSetup(
  data: {
    brandColors: BrandColors;
    logoUrl?: string | null;
  }
): Promise<CompleteBrandSetupResult> {
  // Protected: brand_admin only, brandId from session
  const { userId, brandId } = await requireAuth(['brand_admin']);

  if (!brandId) {
    return { success: false, error: 'No brand associated with your account.' };
  }

  const parsed = brandSetupSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid brand setup data.' };
  }

  const { brandColors, logoUrl } = parsed.data;

  try {
    // Update brand with colors and logo
    await db
      .update(brands)
      .set({
        brandColors,
        logoUrl: logoUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, brandId));

    // Mark onboarding as complete for this user
    await db
      .update(users)
      .set({
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(users.email, userId));

    return { success: true };
  } catch (err) {
    console.error('[completeBrandSetup] Error:', err);
    return {
      success: false,
      error: 'Failed to save brand setup. Please try again.',
    };
  }
}
