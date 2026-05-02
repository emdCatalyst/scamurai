'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { applications, users } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email';
import type { PlanKey } from '@/config/plans';
import { applicationRateLimiter } from '@/lib/ratelimit';
import { applicationSchema } from '@/lib/validations/application';

export type SubmitApplicationResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function submitApplication(
  data: {
    brandName: string;
    contactEmail: string;
    phone?: string;
    plan: PlanKey;
  }
): Promise<SubmitApplicationResult> {
  // 1. Rate Limiting (IP based)
  if (process.env.NODE_ENV === 'production') {
    try {
      const headerList = await headers();
      const ip = headerList.get('x-forwarded-for') || '127.0.0.1';
      
      const { success } = await applicationRateLimiter.limit(ip);
      if (!success) {
        return {
          success: false,
          error: 'errorTooManyRequests',
        };
      }
    } catch (err) {
      // If Redis is down or env vars missing, we log and continue to avoid blocking valid users
      // unless this is a strict requirement. In most cases, fail-open is better for UX.
      console.error('[submitApplication] Rate limit check failed:', err);
    }
  }

  // 2. Validate input
  const parsed = applicationSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: 'errFormFix',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { brandName, contactEmail, phone, plan } = parsed.data;
  const normalizedEmail = contactEmail.trim().toLowerCase();

  // 3. Check if email belongs to an existing user
  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return {
        success: false,
        error: 'errorEmailRegistered',
      };
    }
  } catch (err) {
    console.error('[submitApplication] DB user check failed:', err);
    return {
      success: false,
      error: 'errorGeneral',
    };
  }

  try {
    // Insert application into DB
    await db.insert(applications).values({
      brandName: brandName.trim(),
      contactEmail: normalizedEmail,
      phone: phone?.trim() || null,
      plan,
      status: 'pending',
    });
  } catch (err) {
    console.error('[submitApplication] DB insert failed:', err);
    return {
      success: false,
      error: 'errorGeneral',
    };
  }

  // Send notification email to super admin — failure must NOT fail the action
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (superAdminEmail) {
      const { data, error } = await sendEmail({
        from: 'Scamurai <onboarding@resend.dev>', // Use Resend's testing domain by default to avoid unverified domain errors
        to: superAdminEmail,
        subject: `New Brand Application: ${brandName}`,
        html: `
          <h2>New Brand Application Received</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:8px;font-weight:bold;">Brand Name</td><td style="padding:8px;">${brandName}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Contact Email</td><td style="padding:8px;">${contactEmail}</td></tr>
            ${phone ? `<tr><td style="padding:8px;font-weight:bold;">Phone</td><td style="padding:8px;">${phone}</td></tr>` : ''}
            <tr><td style="padding:8px;font-weight:bold;">Plan</td><td style="padding:8px;">${plan}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Submitted</td><td style="padding:8px;">${new Date().toISOString()}</td></tr>
          </table>
        `,
      });

      if (error) {
        console.error('[submitApplication] Resend API error:', error);
      } else {
        console.log('[submitApplication] Email sent successfully:', data);
      }
    } else {
      console.warn('[submitApplication] SUPER_ADMIN_EMAIL is not set. Skipping email notification.');
    }
  } catch (emailErr) {
    // Catch block for network issues or SDK crashes
    console.error('[submitApplication] Admin notification email failed with exception:', emailErr);
  }

  return { success: true };
}
