import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "errors.currentRequired"),
    newPassword: z
      .string()
      .min(8, "errors.passwordMin")
      .max(128, "errors.passwordMax"),
    confirmPassword: z.string().min(1, "errors.confirmRequired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "errors.mismatch",
  })
  .refine(
    (data) =>
      !data.currentPassword ||
      !data.newPassword ||
      data.currentPassword !== data.newPassword,
    {
      path: ["newPassword"],
      message: "errors.same",
    }
  );

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
