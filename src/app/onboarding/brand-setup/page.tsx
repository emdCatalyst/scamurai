import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import BrandSetup from '@/components/onboarding/BrandSetup';

export const metadata: Metadata = {
  title: 'Brand Setup — Scamurai',
  description: 'Set up your brand appearance with logo and colors.',
};

export default async function BrandSetupPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const role = sessionClaims?.metadata?.role as string | undefined;
  const brandId = sessionClaims?.metadata?.brandId as string | undefined;

  if (role !== 'brand_admin' || !brandId) {
    redirect('/dashboard');
  }

  // Check if onboarding is already complete
  const [user] = await db
    .select({ onboardingComplete: users.onboardingComplete })
    .from(users)
    .where(eq(users.email, userId))
    .limit(1);

  if (user?.onboardingComplete) {
    redirect('/dashboard');
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center py-16 px-4"
      style={{
        background:
          'linear-gradient(180deg, #0d1e35 0%, #060f1a 50%, #0d1e35 100%)',
      }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute top-1/4 start-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-15"
          style={{
            background:
              'radial-gradient(ellipse, rgba(79,197,223,0.25) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="relative z-10 w-full">
        <BrandSetup brandId={brandId} />
      </div>
    </main>
  );
}
