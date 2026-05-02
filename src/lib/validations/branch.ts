import { z } from "zod";

export const branchSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters")
    .regex(/^[a-zA-Z0-9\s\-\u0600-\u06FF]+$/, "Name can only contain letters, numbers, spaces, and hyphens"),
});

export type BranchFormValues = z.infer<typeof branchSchema>;
