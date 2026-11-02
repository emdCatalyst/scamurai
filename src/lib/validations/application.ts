import { z } from 'zod';
import { PLAN_TIERS, SERVICE_KEYS } from '@/config/services';
import { getPlan, getService, isLiveService } from '@/lib/services/catalog';

/**
 * Public application form — shared by the client (instant feedback) and the
 * server action (source of truth). Error messages are translation keys in the
 * `apply` namespace.
 *
 * Business rules derived from the service catalog:
 *  • live services require a plan offered by that service;
 *  • coming-soon services are interest registrations, so any plan is dropped.
 */

export const BRAND_NAME_PATTERN = /^[a-zA-Z0-9؀-ۿ\s-]+$/;
export const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;
export const MAX_BRANCH_COUNT = 10000;

export const applicationSchema = z
  .object({
    service: z.enum(SERVICE_KEYS, { message: 'errService' }),
    // An untouched radio group yields null; treat it as "no plan" so a
    // coming-soon interest registration is never rejected for a hidden field.
    plan: z
      .enum(PLAN_TIERS, { message: 'errPlan' })
      .nullish()
      .transform((plan) => plan ?? undefined),
    brandName: z
      .string({ message: 'errBrandMin' })
      .trim()
      .min(2, 'errBrandMin')
      .max(60, 'errBrandMax')
      .regex(BRAND_NAME_PATTERN, 'errBrandRegex'),
    contactName: z.string({ message: 'errNameMin' }).trim().min(2, 'errNameMin').max(80, 'errNameMax'),
    contactEmail: z.string({ message: 'errEmail' }).trim().toLowerCase().max(254, 'errEmail').email('errEmail'),
    phone: z
      .string({ message: 'errPhone' })
      .trim()
      .optional()
      .refine((val) => !val || PHONE_PATTERN.test(val), { message: 'errPhone' })
      .transform((val) => val || undefined),
    branchCount: z.coerce
      .number({ message: 'errBranchCount' })
      .int('errBranchCount')
      .min(1, 'errBranchCount')
      .max(MAX_BRANCH_COUNT, 'errBranchCount'),
  })
  .superRefine((data, ctx) => {
    const service = getService(data.service);
    if (!isLiveService(service)) return;
    if (!data.plan || !getPlan(service, data.plan)) {
      ctx.addIssue({ code: 'custom', path: ['plan'], message: 'errPlan' });
    }
  })
  .transform((data) => {
    const service = getService(data.service);
    return isLiveService(service) ? data : { ...data, plan: undefined };
  });

/** Raw form values (what the user types). */
export type ApplicationFormValues = z.input<typeof applicationSchema>;
/** Normalised, validated values (what the server stores). */
export type ApplicationData = z.output<typeof applicationSchema>;

/** Field names in the order they appear in the form (used for focus-on-error). */
export const APPLICATION_FIELDS = [
  'service',
  'plan',
  'brandName',
  'contactName',
  'contactEmail',
  'phone',
  'branchCount',
] as const satisfies readonly (keyof ApplicationFormValues)[];
