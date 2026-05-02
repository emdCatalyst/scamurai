import { z } from "zod";

export const brandUserSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["finance", "staff"], {
    error: "Role must be 'finance' or 'staff'",
  }),
  branchId: z.string().uuid("Invalid branch selection").nullable().optional().or(z.literal("")),
}).refine(data => {
  if (!data.branchId) {
    return false;
  }
  return true;
}, {
  message: "Branch is required",
  path: ["branchId"],
});
