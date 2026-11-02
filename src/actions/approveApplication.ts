'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DrizzleQueryError, TransactionRollbackError, eq, like, or, sql } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { applications, brands, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth';
import type { PlanTier } from '@/config/services';
import { canTransition, isApplicationStatus } from '@/lib/applications/status';
import { getPlan, getService, isLiveService, isPlanTier, isServiceKey } from '@/lib/services/catalog';
import {
  escapeLikePattern,
  planRequiresCustomLimits,
  whereTransitionAllowed,
} from '@/lib/queries/applications';
import { customLimitSchema } from '@/components/admin/applications/reviewRules';
import { routing, type Locale } from '@/i18n/routing';

/**
 * paid → approved: creates the brand and its brand-admin user, marks the
 * application approved, then invites the applicant through Clerk to set up
 * their logo and brand colors. Only live services can be approved.
 */

const inputSchema = z.object({
  id: z.uuid(),
  /** Required when the plan has no fixed limits (Enterprise); ignored otherwise. */
  customLimits: z.object({ maxBranches: customLimitSchema, maxUsers: customLimitSchema }).optional(),
});

export type ApproveApplicationInput = z.input<typeof inputSchema>;

export type ApproveApplicationError =
  | 'invalidInput'
  | 'invalidLimits'
  | 'notFound'
  | 'conflict'
  | 'serviceNotLive'
  | 'missingPlan'
  | 'emailInUse'
  | 'brandNameTaken'
  | 'failed';

export type ApproveApplicationResult =
  | { success: true; invitationSent: boolean }
  | { success: false; error: ApproveApplicationError };

type CustomLimits = NonNullable<z.output<typeof inputSchema>['customLimits']>;

interface ApplicationForApproval {
  service: string;
  status: string;
  plan: string | null;
  locale: string;
}

interface ApprovalTerms {
  plan: PlanTier;
  customMaxBranches: number | null;
  customMaxUsers: number | null;
  locale: Locale;
}

const MAX_SLUG_LENGTH = 48;

export async function approveApplication(input: ApproveApplicationInput): Promise<ApproveApplicationResult> {
  await requireAuth(['master_admin']);

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const limitsIssue = parsed.error.issues.some((issue) => issue.path[0] === 'customLimits');
    return failure(limitsIssue ? 'invalidLimits' : 'invalidInput');
  }
  const { id, customLimits } = parsed.data;

  try {
    const [application] = await db
      .select({
        service: applications.service,
        status: applications.status,
        plan: applications.plan,
        locale: applications.locale,
        brandName: applications.brandName,
        contactName: applications.contactName,
        contactEmail: applications.contactEmail,
      })
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    if (!application) return failure('notFound');

    const terms = resolveApprovalTerms(application, customLimits);
    if ('error' in terms) return failure(terms.error);

    const email = application.contactEmail.trim().toLowerCase();
    const [[existingUser], [existingBrand], slug] = await Promise.all([
      db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1),
      db
        .select({ id: brands.id })
        .from(brands)
        .where(sql`lower(${brands.name}) = lower(${application.brandName})`)
        .limit(1),
      findAvailableSlug(slugBaseFor(application.brandName)),
    ]);

    if (existingUser) return failure('emailInUse');
    if (existingBrand) return failure('brandNameTaken');

    const now = new Date();
    const brandId = await db.transaction(async (tx) => {
      const [brand] = await tx
        .insert(brands)
        .values({
          name: application.brandName,
          slug,
          plan: terms.plan,
          customMaxBranches: terms.customMaxBranches,
          customMaxUsers: terms.customMaxUsers,
        })
        .returning({ id: brands.id });

      await tx.insert(users).values({
        email,
        fullName: application.contactName ?? application.brandName,
        role: 'brand_admin',
        brandId: brand.id,
        isActive: true,
        onboardingComplete: false,
      });

      const [approved] = await tx
        .update(applications)
        .set({ status: 'approved', approvedAt: now, brandId: brand.id, updatedAt: now })
        .where(whereTransitionAllowed(id, 'paid', 'approved'))
        .returning({ id: applications.id });

      // Someone else approved or rejected it meanwhile: undo the brand and user.
      if (!approved) tx.rollback();

      return brand.id;
    });

    const invitationSent = await inviteBrandAdmin({ email, brandId, locale: terms.locale });
    return { success: true, invitationSent };
  } catch (error) {
    // A rollback or a unique violation means a concurrent change won the race.
    if (error instanceof TransactionRollbackError || isUniqueViolation(error)) return failure('conflict');
    console.error(`[approveApplication] Failed to approve application ${id}:`, error);
    return failure('failed');
  }
}

function failure(error: ApproveApplicationError): ApproveApplicationResult {
  return { success: false, error };
}

/** Checks the application can be approved and settles the brand's plan and limits. */
function resolveApprovalTerms(
  application: ApplicationForApproval,
  customLimits: CustomLimits | undefined
): ApprovalTerms | { error: ApproveApplicationError } {
  const service = isServiceKey(application.service) ? getService(application.service) : undefined;
  if (!service || !isLiveService(service)) return { error: 'serviceNotLive' };

  if (!isApplicationStatus(application.status) || !canTransition(application.status, 'approved', service)) {
    return { error: 'conflict' };
  }

  const plan = isPlanTier(application.plan) ? getPlan(service, application.plan) : undefined;
  if (!plan) return { error: 'missingPlan' };

  const limits = planRequiresCustomLimits(plan) ? customLimits : undefined;
  if (planRequiresCustomLimits(plan) && !limits) return { error: 'invalidLimits' };

  return {
    plan: plan.tier,
    customMaxBranches: limits?.maxBranches ?? null,
    customMaxUsers: limits?.maxUsers ?? null,
    locale: routing.locales.find((locale) => locale === application.locale) ?? routing.defaultLocale,
  };
}

/**
 * Slug base that satisfies brands_slug_format (`^[a-z0-9-]+$`). Accents are
 * folded to ASCII; names with no Latin letters or digits (e.g. Arabic only)
 * get `brand-` plus a short random suffix.
 */
function slugBaseFor(brandName: string): string {
  const latin = brandName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '');

  return latin || `brand-${randomUUID().slice(0, 8)}`;
}

/** `base`, or `base-2`, `base-3`, … — whichever is free, found with a single query. */
async function findAvailableSlug(base: string): Promise<string> {
  const rows = await db
    .select({ slug: brands.slug })
    .from(brands)
    .where(or(eq(brands.slug, base), like(brands.slug, `${escapeLikePattern(base)}-%`)));

  const taken = new Set(rows.map((row) => row.slug));
  let slug = base;
  for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${base}-${suffix}`;
  return slug;
}

/** Sends the Clerk invitation. Failure is reported, not thrown: the brand already exists. */
async function inviteBrandAdmin({
  email,
  brandId,
  locale,
}: {
  email: string;
  brandId: string;
  locale: Locale;
}): Promise<boolean> {
  try {
    const clerk = await clerkClient();
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${baseUrl}/${locale}/onboarding/brand-setup`,
      publicMetadata: {
        role: 'brand_admin',
        brandId,
        userIsActive: true,
        brandIsActive: true,
      },
    });
    return true;
  } catch (error) {
    console.error(`[approveApplication] Clerk invitation failed for brand ${brandId}:`, error);
    return false;
  }
}

function isUniqueViolation(error: unknown): boolean {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505';
}
