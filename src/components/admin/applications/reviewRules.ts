import { z } from 'zod';
import { enterpriseLimitsSchema } from '@/lib/validations/enterpriseLimits';

/**
 * Validation rules for the review steps, shared by the drawer forms (instant
 * feedback) and the server actions (source of truth) so the two can never
 * disagree. Pure — no React, DB or framework imports.
 */

export const REJECTION_NOTE_MAX_LENGTH = 1000;
export const PAYMENT_REFERENCE_MIN_LENGTH = 2;
export const PAYMENT_REFERENCE_MAX_LENGTH = 100;
export const CUSTOM_LIMIT_MAX = 10_000;

/** Sent to the applicant, so it must say something. */
export const rejectionNoteSchema = z.string().trim().min(1).max(REJECTION_NOTE_MAX_LENGTH);

/** Bank transfer or invoice number: one line, no control characters. */
export const paymentReferenceSchema = z
  .string()
  .trim()
  .min(PAYMENT_REFERENCE_MIN_LENGTH)
  .max(PAYMENT_REFERENCE_MAX_LENGTH)
  .regex(/^[^\p{Cc}]+$/u);

/** A negotiated branch or user cap. */
export const customLimitSchema = z.number().int().min(1).max(CUSTOM_LIMIT_MAX);

const LIMIT_FIELDS = ['customMaxBranches', 'customMaxUsers'] as const;

/**
 * The approval form's negotiated-limits fields (strings, as typed). Tightens
 * the shared enterprise limits schema to whole numbers within the server's
 * range. Error messages are keys in `admin.applications.errors`.
 */
export const customLimitsFormSchema = enterpriseLimitsSchema.superRefine((values, ctx) => {
  for (const field of LIMIT_FIELDS) {
    if (!customLimitSchema.safeParse(Number(values[field])).success) {
      ctx.addIssue({ code: 'custom', path: [field], message: 'invalidLimits' });
    }
  }
});

export type CustomLimitsFormValues = z.infer<typeof customLimitsFormSchema>;
