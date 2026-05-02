import type { UserRole } from '@/lib/auth';

declare global {
  interface CustomJwtSessionClaims {
    email?: string;
    image?: string;
    metadata?: {
      role?: UserRole;
      brandId?: string;
      userIsActive?: boolean;
      brandIsActive?: boolean;
    };
  }
}

export {};
