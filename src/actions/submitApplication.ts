'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { applications, users } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email';
import {
  renderEmail,
  emailHeading,
  emailParagraph,
  emailKeyValue,
  emailButton,
} from '@/lib/email-templates';
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
      const appUrl = (
        process.env.APP_URL || 'http://localhost:3000'
      ).replace(/\/$/, '');
      const adminSlug = process.env.ADMIN_SLUG || 'admin';
      const reviewUrl = `${appUrl}/${adminSlug}/applications`;
      const submittedAt = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Riyadh',
      });

      const rows: Array<{ key: string; value: string }> = [
        { key: 'Brand name', value: brandName },
        { key: 'Contact email', value: contactEmail },
      ];
      if (phone) rows.push({ key: 'Phone', value: phone });
      rows.push(
        { key: 'Requested plan', value: plan },
        { key: 'Submitted', value: submittedAt }
      );

      const html = renderEmail({
        preheader: `${brandName} just submitted a ${plan} application.`,
        bodyHtml: [
          emailHeading('New brand application'),
          emailParagraph(
            `A new brand application was submitted just now. Review the details below and take action when ready.`
          ),
          emailKeyValue(rows),
          emailButton(reviewUrl, 'Review in admin dashboard'),
        ].join('\n'),
      });

      const { data, error } = await sendEmail({
        to: superAdminEmail,
        subject: `New brand application — ${brandName}`,
        html,
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
