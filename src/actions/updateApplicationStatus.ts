'use server';

import { after } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  findIdentityBlocker,
  findPlanBlocker,
  type ActivationBlocker,
} from '@/lib/applications/activation';
import { db } from '@/lib/db';
import { applications } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth';
import { APPLICATION_STATUSES, STATUS_TIMESTAMP_FIELD } from '@/lib/applications/status';
import { whereTransitionAllowed } from '@/lib/queries/applications';
import { rejectionNoteSchema } from '@/components/admin/applications/reviewRules';
import { sendEmail } from '@/lib/email';
import {
  renderEmail,
  emailHeading,
  emailParagraph,
  emailParagraphWithHighlight,
  emailDivider,
} from '@/lib/email-templates';

/**
 * Moves an application to `quoted` or `rejected`. Payment and approval have
 * their own actions (confirmApplicationPayment, approveApplication) because
 * they record more than a status, so they can never be reached from here.
 *
 * `expectedStatus` is the status the admin was looking at. The update only
 * applies while the row is still in that status (optimistic concurrency), so
 * a stale screen can never, say, reject an application that has just been paid.
 */

const target = {
  id: z.uuid(),
  expectedStatus: z.enum(APPLICATION_STATUSES),
};

const inputSchema = z.discriminatedUnion('status', [
  z.object({ ...target, status: z.literal('quoted') }),
  z.object({ ...target, status: z.literal('rejected'), rejectionNote: rejectionNoteSchema }),
]);

export type UpdateApplicationStatusInput = z.input<typeof inputSchema>;

export type UpdateApplicationStatusError =
  | 'invalidInput'
  | 'invalidRejectionNote'
  | 'conflict'
  | 'failed'
  | ActivationBlocker;

export type UpdateApplicationStatusResult =
  | { success: true }
  | { success: false; error: UpdateApplicationStatusError };

export async function updateApplicationStatus(
  input: UpdateApplicationStatusInput
): Promise<UpdateApplicationStatusResult> {
  await requireAuth(['master_admin']);

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const noteIssue = parsed.error.issues.some((issue) => issue.path[0] === 'rejectionNote');
    return { success: false, error: noteIssue ? 'invalidRejectionNote' : 'invalidInput' };
  }

  const data = parsed.data;
  const now = new Date();
  const enteredAt: Partial<Record<(typeof STATUS_TIMESTAMP_FIELD)[typeof data.status], Date>> = {
    [STATUS_TIMESTAMP_FIELD[data.status]]: now,
  };

  try {
    // Don't ask for payment on an application that approval would refuse.
    if (data.status === 'quoted') {
      const blocker = await findQuoteBlocker(data.id);
      if (blocker) return { success: false, error: blocker };
    }

    const [updated] = await db
      .update(applications)
      .set({
        status: data.status,
        ...enteredAt,
        ...(data.status === 'rejected' ? { rejectionNote: data.rejectionNote } : {}),
        updatedAt: now,
      })
      .where(whereTransitionAllowed(data.id, data.expectedStatus, data.status))
      .returning({
        brandName: applications.brandName,
        contactEmail: applications.contactEmail,
        locale: applications.locale,
      });

    if (!updated) return { success: false, error: 'conflict' };

    if (data.status === 'rejected') {
      const rejectionNote = data.rejectionNote;
      // Respond first; the email must not slow down or fail the admin's action.
      after(() => sendRejectionEmail({ ...updated, rejectionNote, applicationId: data.id }));
    }

    return { success: true };
  } catch (error) {
    console.error(`[updateApplicationStatus] Failed to update application ${data.id}:`, error);
    return { success: false, error: 'failed' };
  }
}

async function findQuoteBlocker(id: string): Promise<UpdateApplicationStatusError | null> {
  const [application] = await db
    .select({
      service: applications.service,
      plan: applications.plan,
      brandName: applications.brandName,
      contactEmail: applications.contactEmail,
    })
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  if (!application) return 'conflict';
  return findPlanBlocker(application) ?? (await findIdentityBlocker(application.contactEmail, application.brandName));
}

interface RejectionEmail {
  applicationId: string;
  brandName: string;
  contactEmail: string;
  locale: string;
  rejectionNote: string;
}

/** Bilingual rejection email, in the applicant's language first. Helpers HTML-escape every value. */
async function sendRejectionEmail({ applicationId, brandName, contactEmail, locale, rejectionNote }: RejectionEmail) {
  const arabicFirst = locale === 'ar';

  const english = [
    `<div dir="ltr">`,
    emailHeading('Update on your application'),
    emailParagraph('Hello,'),
    emailParagraphWithHighlight({
      before: 'Thank you for your interest in Scamurai. After reviewing your application for ',
      highlight: brandName,
      after: ', we are unable to move forward at this time.',
    }),
    emailParagraphWithHighlight({ before: 'Reason: ', highlight: rejectionNote, after: '' }),
    emailParagraph('We appreciate the time you took to apply and wish you success in your operations.'),
    emailParagraph('— The Scamurai Team'),
    `</div>`,
  ].join('\n');

  const arabic = [
    `<div dir="rtl">`,
    emailHeading('تحديث بخصوص طلبك', 'rtl'),
    emailParagraph('مرحباً،', 'rtl'),
    emailParagraphWithHighlight({
      before: 'شكراً لاهتمامك بسكامورائي. بعد مراجعة طلب انضمام ',
      highlight: brandName,
      after: '، لا يمكننا المضي قدماً في الوقت الحالي.',
      dir: 'rtl',
    }),
    emailParagraphWithHighlight({ before: 'السبب: ', highlight: rejectionNote, after: '', dir: 'rtl' }),
    emailParagraph('نقدّر الوقت الذي خصصته لتقديم طلبك ونتمنى لك التوفيق في أعمالك.', 'rtl'),
    emailParagraph('— فريق سكامورائي', 'rtl'),
    `</div>`,
  ].join('\n');

  const subjects = {
    en: 'Update on your Scamurai application',
    ar: 'تحديث بخصوص طلبك في سكامورائي',
  };

  try {
    const html = renderEmail({
      preheader: arabicFirst ? `تحديث بخصوص طلب ${brandName}` : `Update on your application for ${brandName}`,
      bodyHtml: (arabicFirst ? [arabic, english] : [english, arabic]).join(`\n${emailDivider()}\n`),
      dir: arabicFirst ? 'rtl' : 'ltr',
      lang: arabicFirst ? 'ar' : 'en',
    });

    const { error } = await sendEmail({
      to: [contactEmail],
      subject: arabicFirst ? `${subjects.ar} / ${subjects.en}` : `${subjects.en} / ${subjects.ar}`,
      html,
    });
    if (error) console.error(`[updateApplicationStatus] Rejection email for ${applicationId} was not sent:`, error);
  } catch (error) {
    console.error(`[updateApplicationStatus] Rejection email for ${applicationId} failed:`, error);
  }
}
