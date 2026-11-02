import { eq, exists, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brands, users } from '@/lib/db/schema';
import { getPlan, getService, isLiveService, isPlanTier, isServiceKey } from '@/lib/services/catalog';

/**
 * Approval creates a brand (unique name) and its admin user (unique email) on
 * a plan of a live service. These checks run before the customer is quoted,
 * so payment is never requested for an application that cannot be activated,
 * and again at approval, because the facts can change in between.
 */

export type PlanBlocker = 'serviceNotLive' | 'missingPlan';
export type IdentityBlocker = 'emailInUse' | 'brandNameTaken';
export type ActivationBlocker = PlanBlocker | IdentityBlocker;

/** The application must be for a live service and name one of its plans. No I/O. */
export function findPlanBlocker(application: { service: string; plan: string | null }): PlanBlocker | null {
  const service = isServiceKey(application.service) ? getService(application.service) : undefined;
  if (!service || !isLiveService(service)) return 'serviceNotLive';
  if (!isPlanTier(application.plan) || !getPlan(service, application.plan)) return 'missingPlan';
  return null;
}

/**
 * The contact email must not belong to a user and the brand name must be free
 * (case-insensitive, soft-deleted brands included: the unique index covers
 * them). One round trip for both.
 */
export async function findIdentityBlocker(contactEmail: string, brandName: string): Promise<IdentityBlocker | null> {
  const email = contactEmail.trim().toLowerCase();
  const userWithEmail = db.select({ id: users.id }).from(users).where(eq(users.email, email));
  const brandWithName = db
    .select({ id: brands.id })
    .from(brands)
    .where(sql`lower(${brands.name}) = lower(${brandName})`);

  const [row] = await db.execute<{ emailInUse: boolean; brandNameTaken: boolean }>(
    sql`select ${exists(userWithEmail)} as "emailInUse", ${exists(brandWithName)} as "brandNameTaken"`
  );
  if (row.emailInUse) return 'emailInUse';
  if (row.brandNameTaken) return 'brandNameTaken';
  return null;
}
