import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, brands } from '@/lib/db/schema';
import BrandSetup from '@/components/onboarding/BrandSetup';
import InviteAcceptForm from '@/components/onboarding/InviteAcceptForm';

export const metadata: Metadata = {
  title: 'Brand Setup — Scamurai',
  description: 'Set up your brand appearance with logo and colors.',
};

export default async function BrandSetupPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { userId, sessionClaims } = await auth();
  const { locale } = await props.params;
  const searchParams = await props.searchParams;

  if (!userId) {
    // If the URL contains a Clerk invitation ticket, render the custom
    // set-password form so the invitee can finish account setup.
    const ticket =
      typeof searchParams.__clerk_ticket === 'string'
        ? searchParams.__clerk_ticket
        : undefined;

    if (ticket) {
      return (
        <main
          className="min-h-screen flex items-center justify-center p-4"
          style={{ background: '#060f1a' }}
        >
          <InviteAcceptForm ticket={ticket} locale={locale} />
        </main>
      );
    }
    // No login and no ticket? Send them home.
    redirect('/');
  }

  let role = sessionClaims?.metadata?.role as string | undefined;
  let brandId = sessionClaims?.metadata?.brandId as string | undefined;

  // Fallback: the session claims might not have updated yet right after signing up
  if (!role || !brandId) {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    role = clerkUser.publicMetadata?.role as string | undefined;
    brandId = clerkUser.publicMetadata?.brandId as string | undefined;
  }

  if (role !== 'brand_admin' || !brandId) {
    // If they aren't a brand admin, they shouldn't be here
    redirect('/');
  }

  // Resolve the brand slug — needed to redirect into the brand's dashboard
  // once onboarding is complete (and for the same redirect on the
  // already-complete fast-path below).
  const [brand] = await db
    .select({ slug: brands.slug })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  if (!brand) {
    redirect('/');
  }
  const brandDashboardUrl = `/${locale}/brands/${brand.slug}/dashboard`;

  // Check if onboarding is already complete
  // We match by clerkUserId (provided by auth())
  let [user] = await db
    .select({ onboardingComplete: users.onboardingComplete, email: users.email })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  // Fallback: If not found by Clerk ID, the webhook might not have finished yet.
  // Match by email as a secondary check if we can get it from Clerk.
  if (!user) {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (email) {
      const [userByEmail] = await db
        .select({ onboardingComplete: users.onboardingComplete, email: users.email })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      user = userByEmail;

      // If found by email, it means the webhook hasn't linked it yet.
      // We can link it now to prevent the user from being stuck.
      if (user) {
        await db
          .update(users)
          .set({ clerkUserId: userId, joinedAt: new Date() })
          .where(eq(users.email, email.toLowerCase()));
      }
    }
  }

  if (!user) {
    // If still no user, something is wrong with the invitation/approval link
    redirect(brandDashboardUrl);
  }

  if (user.onboardingComplete) {
    redirect(brandDashboardUrl);
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
        <BrandSetup brandId={brandId} brandSlug={brand.slug} />
      </div>
    </main>
  );
}
