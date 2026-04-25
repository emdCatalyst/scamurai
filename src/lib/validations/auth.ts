import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'errors.emailRequired').email('errors.emailInvalid'),
  password: z.string().min(8, 'errors.passwordMin'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
