import { z } from 'zod';

export const applicationSchema = z.object({
  brandName: z
    .string()
    .min(2, 'errBrandMin')
    .max(60, 'errBrandMax')
    .regex(
      /^[a-zA-Z0-9\u0600-\u06FF\s-]+$/,
      'errBrandRegex'
    ),
  contactEmail: z
    .string()
    .email('errEmail'),
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^\+?[0-9\s\-()]{7,20}$/.test(val), {
      message: 'errPhone',
    }),
  plan: z.enum(['starter', 'growth', 'enterprise'] as const, {
    message: 'errPlan',
  }),
});
