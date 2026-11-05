import type { Viewport } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ORDER_SUBMITTER_ROLES, requireAuth } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/queries/brands";
import { getEnabledDeliveryAppOptions } from "@/lib/queries/orders";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { LogOut, UserRound } from "lucide-react";
import StaffSignOutButton from "@/components/staff/StaffSignOutButton";
import OrderSubmitForm from "@/components/staff/OrderSubmitForm";
import InstallAppButton from "@/components/staff/InstallAppButton";
import ServiceWorker from "@/components/staff/ServiceWorker";
import StaffVitals from "@/components/staff/StaffVitals";
import LocaleSwitcher from "@/components/ui/LocaleSwitcher";
import { localizedPath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";

/**
 * Installed on an iPhone, the app draws under the status bar (the brand
 * layout asks for a translucent one), so the screen pads itself by the
 * safe areas.
 */
export const viewport: Viewport = { viewportFit: "cover" };

/** Header buttons: 44 px, for a thumb on an old touchscreen. */
const HEADER_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-full text-[var(--brand-background-fg-muted)] transition-colors hover:bg-[var(--brand-background-active)] hover:text-[var(--brand-background-fg)]";

export default async function StaffSubmitPage({
  params,
}: {
  params: Promise<{ locale: string; brandSlug: string }>;
}) {
  const { locale, brandSlug } = await params;
  setRequestLocale(locale);

  // 1. Auth check
  const { userId: clerkUserId, role, brandId: sessionBrandId } = await requireAuth();

  // 2. Resolve Brand
  const brand = await getBrandBySlug(brandSlug);
  if (!brand || sessionBrandId !== brand.id) notFound();

  // 3. Only staff send orders, and the order APIs refuse everyone else: the brand's other members go to their own screens.
  if (!ORDER_SUBMITTER_ROLES.includes(role)) {
    redirect(localizedPath(locale as Locale, `/brands/${brandSlug}/${role === "finance" ? "orders" : "dashboard"}`));
  }

  const t = await getTranslations("brand.submit");

  // 4. Fetch User & Branch Info
  const user = await db.query.users.findFirst({
    where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
    with: {
      branch: true,
    },
  });

  if (!user || !user.branchId) {
    // If staff has no branch, they can't submit orders
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center bg-[var(--brand-surface)]">
        <h1 className="text-xl font-bold text-[var(--brand-text-accent)] mb-2">
          {t('noBranchTitle')}
        </h1>
        <p className="text-[var(--brand-surface-fg-muted)] mb-6">
          {t('noBranchDesc')}
        </p>
        <StaffSignOutButton
          redirectUrl={localizedPath(locale as Locale, `/brands/${brandSlug}/login`)}
          className="min-h-11 px-4 text-[var(--brand-primary)] font-semibold"
        >
          {t('signOut')}
        </StaffSignOutButton>
      </div>
    );
  }

  // 5. The brand's delivery apps that are turned on
  const apps = (await getEnabledDeliveryAppOptions(brand.id)).map(({ id, name }) => ({ id, name }));
  const signedInAs = t("signedInAs", { name: user.fullName });

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] text-[var(--brand-surface-fg)]">
      <ServiceWorker />
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--brand-border)] bg-[var(--brand-background)] pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            {brand.logoUrl ? (
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--brand-primary)] text-[10px] font-bold text-[var(--brand-primary-fg)]">
                {brand.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-bold text-[var(--brand-background-fg)]">{brand.name}</span>
              <span className="truncate text-[10px] font-medium text-[var(--brand-background-fg-muted)]">
                {user.branch?.name || t('noBranchTitle')}
              </span>
              {/* On a shared phone, whoever picks it up sees whose orders they would be saving. */}
              <span className="flex min-w-0 items-center gap-1 text-[10px] font-semibold text-[var(--brand-background-fg)]" title={signedInAs}>
                <UserRound className="h-3 w-3 shrink-0" aria-hidden />
                <span className="sr-only">{signedInAs}</span>
                <span className="truncate" aria-hidden>{user.fullName}</span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <InstallAppButton className={HEADER_BUTTON} />
            <LocaleSwitcher className="min-h-11 border-[var(--brand-border)] bg-transparent px-4 text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-background-fg)]" />
            {/* Set apart from the language button: signing out by mistake means typing the password again. */}
            <StaffSignOutButton
              redirectUrl={localizedPath(locale as Locale, `/brands/${brandSlug}/login`)}
              title={t('signOut')}
              className={`${HEADER_BUTTON} ms-2`}
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </StaffSignOutButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md">
        <StaffVitals />
        <OrderSubmitForm
          userId={clerkUserId}
          brandId={brand.id}
          brandSlug={brand.slug}
          apps={apps}
        />
      </main>
    </div>
  );
}
