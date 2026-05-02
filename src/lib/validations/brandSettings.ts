import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const brandIdentitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name must be at most 60 characters'),
  logoUrl: z.string().url().nullable().optional(),
  brandColors: z.object({
    primary: z.string().regex(hexColorRegex, 'Invalid hex color'),
    background: z.string().regex(hexColorRegex, 'Invalid hex color'),
    surface: z.string().regex(hexColorRegex, 'Invalid hex color'),
    textAccent: z.string().regex(hexColorRegex, 'Invalid hex color'),
  }),
});

export const accountDetailsSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
});
