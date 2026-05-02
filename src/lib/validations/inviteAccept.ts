import { z } from "zod";

export const inviteAcceptSchema = z
  .object({
    password: z
      .string()
      .min(8, "errors.passwordMin")
      .max(128, "errors.passwordMax"),
    confirmPassword: z.string().min(1, "errors.confirmRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "errors.mismatch",
  });

export type InviteAcceptFormValues = z.infer<typeof inviteAcceptSchema>;
