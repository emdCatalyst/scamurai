import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'errors.emailRequired').email('errors.emailInvalid'),
  password: z.string().min(8, 'errors.passwordMin'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: z.string().min(1, 'errors.emailRequired').email('errors.emailInvalid'),
});

export type ForgotPasswordRequestValues = z.infer<typeof forgotPasswordRequestSchema>;

export const forgotPasswordVerifySchema = z
  .object({
    code: z
      .string()
      .min(6, 'errors.codeInvalid')
      .max(6, 'errors.codeInvalid')
      .regex(/^\d{6}$/, 'errors.codeInvalid'),
    password: z
      .string()
      .min(8, 'errors.passwordMin')
      .max(128, 'errors.passwordMax'),
    confirmPassword: z.string().min(1, 'errors.confirmRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'errors.mismatch',
  });

export type ForgotPasswordVerifyValues = z.infer<typeof forgotPasswordVerifySchema>;
