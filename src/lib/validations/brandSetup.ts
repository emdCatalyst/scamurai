import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const brandSetupSchema = z.object({
  brandColors: z.object({
    primary: z.string().regex(hexColorRegex, 'Invalid hex color'),
    background: z.string().regex(hexColorRegex, 'Invalid hex color'),
    surface: z.string().regex(hexColorRegex, 'Invalid hex color'),
    textAccent: z.string().regex(hexColorRegex, 'Invalid hex color'),
  }),
  logoUrl: z.string().url().nullable().optional(),
});
