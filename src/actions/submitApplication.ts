'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { and, eq, exists, inArray, sql } from 'drizzle-orm';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from '@/lib/zod';
import type { ServiceKey } from '@/config/services';
import { routing, type Locale } from '@/i18n/routing';
import { OPEN_APPLICATION_STATUSES } from '@/lib/applications/status';
import { getService, isLiveService } from '@/lib/services/catalog';
import { db } from '@/lib/db';
import { applications, users } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email';
import { emailButton, emailHeading, emailKeyValue, emailParagraph, renderEmail } from '@/lib/email-templates';
import { isApplicationRateLimited } from '@/lib/ratelimit';
import { applicationSchema, type ApplicationData } from '@/lib/validations/application';
import { isHoneypotFilled } from '@/components/apply/honeypot';
import { localizedPath } from '@/i18n/paths';
import { getAppUrl } from '@/lib/seo/site';

/** Every error the form can show; each one is a key in the `apply` namespace. */
export type ApplyErrorKey = 'errFormFix' | 'errorTooManyRequests' | 'errorEmailRegistered' | 'errorGeneral';

/** Field → `apply` message keys, straight from the shared schema. */
export type ApplyFieldErrors = Partial<Record<keyof ApplicationData, string[]>>;

export type SubmitApplicationResult =
  | { success: true }
  | { success: false; error: ApplyErrorKey; fieldErrors?: ApplyFieldErrors };

/**
 * Public application form endpoint. The input is untrusted: it is parsed with
 * the same schema the form uses, and nothing reaches the database unless it
 * passes. Order: honeypot and validation (no I/O) → rate limit → one query
 * for both duplicate checks → insert. The admin email is sent after the
 * response, so the visitor never waits on the email provider.
 *
 * A repeat request for a service the email already has open gets the normal
 * success response (no second row, admins are told it's a possible
 * duplicate). Answering "already applied" would let anyone probe whether an
 * address has an open quote, or squat a business's email to block it.
 */
export async function submitApplication(input: unknown): Promise<SubmitApplicationResult> {
  // Bots that fill the hidden field get a convincing success and nothing else.
  if (isHoneypotFilled(input)) return { success: true };

  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'errFormFix', fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const application = parsed.data;

  if (await isApplicationRateLimited(await headers())) {
    return { success: false, error: 'errorTooManyRequests' };
  }

  const locale = await resolveLocale();

  let duplicate: boolean;
  try {
    const { emailRegistered, alreadyApplied } = await findConflicts(application.contactEmail, application.service);
    // Existing customers may still register interest in services that aren't live yet.
    if (emailRegistered && isLiveService(getService(application.service))) {
      return { success: false, error: 'errorEmailRegistered' };
    }

    duplicate = alreadyApplied;
    if (!duplicate) {
      await db.insert(applications).values({
        service: application.service,
        plan: application.plan ?? null,
        brandName: application.brandName,
        contactName: application.contactName,
        contactEmail: application.contactEmail,
        phone: application.phone ?? null,
        branchCount: application.branchCount,
        locale,
        status: 'pending',
      });
    }
  } catch (err) {
    console.error('[submitApplication] Database error:', err);
    return { success: false, error: 'errorGeneral' };
  }

  const submittedAt = new Date();
  after(async () => {
    try {
      await notifyAdmin(application, locale, submittedAt, duplicate);
    } catch (err) {
      // The application is stored; a failed notification must not surface to the visitor.
      console.error('[submitApplication] Admin notification failed:', err);
    }
  });

  return { success: true };
}

/** The visitor's locale (from the localized URL the action was posted to), stored on the row. */
async function resolveLocale(): Promise<Locale> {
  const locale = await getLocale();
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}

/**
 * Both duplicate checks in one round trip. Soft-deleted users count too: the
 * unique constraint on users.email would block approving them anyway.
 */
async function findConflicts(
  email: string,
  service: ServiceKey
): Promise<{ emailRegistered: boolean; alreadyApplied: boolean }> {
  const registeredUser = db.select({ id: users.id }).from(users).where(eq(users.email, email));
  const openApplication = db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.contactEmail, email),
        eq(applications.service, service),
        inArray(applications.status, OPEN_APPLICATION_STATUSES)
      )
    );

  const [row] = await db.execute<{ emailRegistered: boolean; alreadyApplied: boolean }>(
    sql`select ${exists(registeredUser)} as "emailRegistered", ${exists(openApplication)} as "alreadyApplied"`
  );
  return { emailRegistered: row.emailRegistered, alreadyApplied: row.alreadyApplied };
}

const SUBMITTED_AT_FORMAT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Riyadh',
});
const LANGUAGE_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });
const INTEREST_LABEL = 'Interest registration (coming soon)';

function adminApplicationsUrl(): string {
  return `${getAppUrl()}${localizedPath('en', `/${process.env.ADMIN_SLUG || 'admin'}/applications`)}`;
}

/** Internal notification to the team, always in English. */
async function notifyAdmin(
  application: ApplicationData,
  locale: Locale,
  submittedAt: Date,
  duplicate: boolean
): Promise<void> {
  const to = process.env.SUPER_ADMIN_EMAIL;
  if (!to) {
    console.warn('[submitApplication] SUPER_ADMIN_EMAIL is not set; skipping the admin notification.');
    return;
  }

  const [tServices, tPlans] = await Promise.all([
    getTranslations({ locale: 'en', namespace: 'services' }),
    getTranslations({ locale: 'en', namespace: 'plans' }),
  ]);
  const serviceName = tServices(`${application.service}.name`);
  const planLabel = application.plan ? tPlans(application.plan) : INTEREST_LABEL;
  const kind = `${duplicate ? 'possible duplicate ' : ''}${application.plan ? 'application' : 'interest registration'}`;
  // The schema allows any whitespace in brand names; keep the subject on one line.
  const brandName = application.brandName.replace(/\s+/g, ' ');

  const rows = [
    { key: 'Service', value: serviceName },
    { key: 'Plan', value: planLabel },
    { key: 'Brand name', value: brandName },
    { key: 'Branches', value: String(application.branchCount) },
    { key: 'Contact name', value: application.contactName },
    { key: 'Email', value: application.contactEmail },
    ...(application.phone ? [{ key: 'Phone', value: application.phone }] : []),
    { key: 'Language', value: LANGUAGE_NAMES.of(locale) ?? locale },
    { key: 'Submitted', value: `${SUBMITTED_AT_FORMAT.format(submittedAt)} (Riyadh time)` },
  ];

  // The template helpers HTML-escape every text and attribute they receive, so
  // applicant input is passed as-is (escaping it here would double-encode it).
  const html = renderEmail({
    preheader: `${brandName}: ${serviceName}, ${planLabel}`,
    bodyHtml: [
      emailHeading(`New ${kind}`),
      emailParagraph(
        duplicate
          ? `${brandName} submitted ${serviceName} again with an email that already has an open request. No new row was created; compare these details with the open request in the admin dashboard.`
          : `${brandName} submitted a new ${kind} for ${serviceName}. Review it in the admin dashboard.`
      ),
      emailKeyValue(rows),
      emailButton(adminApplicationsUrl(), 'Review in admin dashboard'),
    ].join('\n'),
  });

  const { error } = await sendEmail({ to, subject: `New ${kind}: ${brandName} (${serviceName})`, html });
  if (error) console.error('[submitApplication] Resend rejected the admin notification:', error);
}
