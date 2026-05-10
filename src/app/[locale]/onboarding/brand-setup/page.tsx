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

  // If the URL contains a Clerk invitation ticket, ALWAYS render the custom
  // set-password form. We do this even if a different Clerk session already
  // exists in the browser (e.g. a master admin signed in in the same browser,
  // or a stale session from an old invite) — otherwise the invitee gets
  // misidentified as the existing user and bounced to '/'. The form itself
  // signs the existing session out before consuming the ticket.
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

  if (!userId) {
    // No login and no ticket? Send them home.
    redirect('/');
  }

  let role = sessionClaims?.metadata?.role as string | undefined;
  let brandId = sessionClaims?.metadata?.brandId as string | undefined;

  // 1st fallback: session JWT claims may not have refreshed yet right after
  // signing up. Pull straight from Clerk's user record.
  if (!role || !brandId) {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      role = (clerkUser.publicMetadata?.role as string | undefined) ?? role;
      brandId = (clerkUser.publicMetadata?.brandId as string | undefined) ?? brandId;
    } catch (err) {
      console.warn('[brand-setup] Clerk getUser fallback failed:', err);
    }
  }

  // 2nd fallback: trust our own DB. `approveApplication` writes the
  // brand_admin row + brand id BEFORE the Clerk invite is sent, so by the
  // time the invitee lands here we always have an authoritative row. If
  // Clerk's invitation→user metadata transfer hasn't happened (or Clerk's
  // webhook hasn't linked clerkUserId yet) we self-heal both sides instead
  // of bouncing them to '/'.
  if (role !== 'brand_admin' || !brandId) {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase();

      let dbUser:
        | {
            id: string;
            role: string;
            brandId: string | null;
            isActive: boolean;
            clerkUserId: string | null;
          }
        | undefined;

      // Match by clerkUserId first (set by the user.created webhook), then
      // by email (set by approveApplication, before the webhook fires).
      const [byClerk] = await db
        .select({
          id: users.id,
          role: users.role,
          brandId: users.brandId,
          isActive: users.isActive,
          clerkUserId: users.clerkUserId,
        })
        .from(users)
        .where(eq(users.clerkUserId, userId))
        .limit(1);
      dbUser = byClerk;

      if (!dbUser && email) {
        const [byEmail] = await db
          .select({
            id: users.id,
            role: users.role,
            brandId: users.brandId,
            isActive: users.isActive,
            clerkUserId: users.clerkUserId,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        dbUser = byEmail;
      }

      if (dbUser?.role === 'brand_admin' && dbUser.brandId && dbUser.isActive) {
        role = 'brand_admin';
        brandId = dbUser.brandId;

        // Heal Clerk's publicMetadata so subsequent requests have the role
        // in the JWT and the proxy / requireAuth fast-paths work.
        try {
          await clerk.users.updateUser(userId, {
            publicMetadata: {
              ...clerkUser.publicMetadata,
              role: 'brand_admin',
              brandId: dbUser.brandId,
              userIsActive: true,
              brandIsActive: true,
            },
          });
        } catch (healErr) {
          console.warn('[brand-setup] Failed to heal Clerk publicMetadata:', healErr);
        }

        // Heal the DB row's clerkUserId link if the webhook hasn't yet.
        if (!dbUser.clerkUserId) {
          try {
            await db
              .update(users)
              .set({ clerkUserId: userId, joinedAt: new Date() })
              .where(eq(users.id, dbUser.id));
          } catch (linkErr) {
            console.warn('[brand-setup] Failed to link clerkUserId on DB row:', linkErr);
          }
        }
      }
    } catch (err) {
      console.error('[brand-setup] DB-based role recovery failed:', err);
    }
  }

  if (role !== 'brand_admin' || !brandId) {
    console.warn('[brand-setup] redirect to / — could not resolve brand_admin context', {
      userId,
      role,
      brandId,
    });
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
