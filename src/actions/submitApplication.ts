'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { applications } from '@/lib/db/schema';
import { getResend } from '@/lib/resend';
import type { PlanKey } from '@/config/plans';

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
  // Validate input
  const parsed = applicationSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix the form errors below.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { brandName, contactEmail, phone, plan } = parsed.data;

  try {
    // Insert application into DB
    await db.insert(applications).values({
      brandName: brandName.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      phone: phone?.trim() || null,
      plan,
      status: 'pending',
    });
  } catch (err) {
    console.error('[submitApplication] DB insert failed:', err);
    return {
      success: false,
      error: 'Something went wrong. Please try again later.',
    };
  }

  // Send notification email to super admin — failure must NOT fail the action
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (superAdminEmail) {
      const { data, error } = await getResend().emails.send({
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
