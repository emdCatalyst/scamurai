'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { applications } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth';
import { getResend } from '@/lib/resend';

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['quoted', 'rejected']),
  rejectionNote: z.string().optional(),
});

export type UpdateApplicationStatusResult =
  | { success: true }
  | { success: false; error: string };

export async function updateApplicationStatus(
  data: {
    id: string;
    status: 'quoted' | 'rejected';
    rejectionNote?: string;
  }
): Promise<UpdateApplicationStatusResult> {
  // Protected: master_admin only
  await requireAuth(['master_admin']);

  const parsed = updateStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input.' };
  }

  const { id, status, rejectionNote } = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Application not found.' };
    }

    // Validate forward-only transition (Simplified check for now)
    if (existing.status === 'approved' || existing.status === 'rejected') {
       return { success: false, error: 'Cannot change status of an approved or rejected application.' };
    }

    await db
      .update(applications)
      .set({
        status,
        rejectionNote: status === 'rejected' ? (rejectionNote ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id));

    // Send email on rejection
    if (status === 'rejected') {
      try {
        console.log(`[updateApplicationStatus] Attempting to send rejection email to ${existing.contactEmail}`);
        const resend = getResend();
        const note = rejectionNote || 'No specific reason provided / لم يتم تقديم سبب محدد';
        const result = await resend.emails.send({
          from: 'Scamurai <onboarding@resend.dev>',
          to: [existing.contactEmail],
          subject: 'Update on your Scamurai application / تحديث بخصوص طلب انضمامك لسكامورائي',
          html: `
            <div dir="ltr" style="font-family: sans-serif; margin-bottom: 20px;">
              <p>Hello,</p>
              <p>Thank you for your interest in Scamurai. Unfortunately, we are unable to proceed with your application for <strong>${existing.brandName}</strong> at this time.</p>
              <p><strong>Reason:</strong> ${note}</p>
              <p>Best regards,<br>Scamurai Team</p>
            </div>
            <hr>
            <div dir="rtl" style="font-family: sans-serif; margin-top: 20px;">
              <p>مرحباً،</p>
              <p>شكراً لاهتمامك بسكامورائي. للأسف، لا يمكننا المضي قدماً في طلب انضمام <strong>${existing.brandName}</strong> في الوقت الحالي.</p>
              <p><strong>السبب:</strong> ${note}</p>
              <p>مع أطيب التحيات،<br>فريق سكامورائي</p>
            </div>
          `,
        });
        console.log('[updateApplicationStatus] Email send result:', result);
      } catch (emailErr) {
        console.error('[updateApplicationStatus] Email failed:', emailErr);
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[updateApplicationStatus] Error:', err);
    return {
      success: false,
      error: 'Failed to update application status.',
    };
  }
}
