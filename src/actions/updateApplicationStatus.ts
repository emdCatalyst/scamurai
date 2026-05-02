'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { applications } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import {
  renderEmail,
  emailHeading,
  emailParagraph,
  emailParagraphWithHighlight,
  emailDivider,
} from '@/lib/email-templates';

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
        const noteEn = rejectionNote || 'No specific reason was provided.';
        const noteAr = rejectionNote || 'لم يتم تقديم سبب محدد.';

        const html = renderEmail({
          preheader: `Update on your application for ${existing.brandName}`,
          bodyHtml: [
            // English section
            `<div dir="ltr">`,
            emailHeading('Update on your application'),
            emailParagraph('Hello,'),
            emailParagraphWithHighlight({
              before:
                'Thank you for your interest in Scamurai. After reviewing your application for ',
              highlight: existing.brandName,
              after:
                ', we are unable to move forward at this time.',
            }),
            emailParagraphWithHighlight({
              before: 'Reason: ',
              highlight: noteEn,
              after: '',
            }),
            emailParagraph(
              "We appreciate the time you took to apply and wish you success in your operations."
            ),
            emailParagraph('— The Scamurai Team'),
            `</div>`,
            emailDivider(),
            // Arabic section
            `<div dir="rtl">`,
            emailHeading('تحديث بخصوص طلبك', 'rtl'),
            emailParagraph('مرحباً،', 'rtl'),
            emailParagraphWithHighlight({
              before: 'شكراً لاهتمامك بسكامورائي. بعد مراجعة طلب انضمام ',
              highlight: existing.brandName,
              after: '، لا يمكننا المضي قدماً في الوقت الحالي.',
              dir: 'rtl',
            }),
            emailParagraphWithHighlight({
              before: 'السبب: ',
              highlight: noteAr,
              after: '',
              dir: 'rtl',
            }),
            emailParagraph(
              'نقدّر الوقت الذي خصصته لتقديم طلبك ونتمنى لك التوفيق في أعمالك.',
              'rtl'
            ),
            emailParagraph('— فريق سكامورائي', 'rtl'),
            `</div>`,
          ].join('\n'),
        });

        const result = await sendEmail({
          to: [existing.contactEmail],
          subject:
            'Update on your Scamurai application / تحديث بخصوص طلبك في سكامورائي',
          html,
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
