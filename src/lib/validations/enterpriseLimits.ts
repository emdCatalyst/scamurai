import { z } from 'zod';

export const enterpriseLimitsSchema = z.object({
  customMaxBranches: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: 'invalidLimits',
    }),
  customMaxUsers: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: 'invalidLimits',
    }),
});

export type EnterpriseLimits = z.infer<typeof enterpriseLimitsSchema>;
