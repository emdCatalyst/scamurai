import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const brandSetupSchema = z.object({
  brandColors: z.object({
    primary: z.string().regex(hexColorRegex, 'Invalid hex color'),
    background: z.string().regex(hexColorRegex, 'Invalid hex color'),
    surface: z.string().regex(hexColorRegex, 'Invalid hex color'),
    textAccent: z.string().regex(hexColorRegex, 'Invalid hex color'),
  }),
  // Only our own /media paths (from the upload endpoint); the action checks ownership.
  logoUrl: z.string().startsWith('/media/').max(200).nullable().optional(),
});
