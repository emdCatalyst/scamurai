import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/queries/brands";
import { db } from "@/lib/db";
import { users, brandDeliveryApps, deliveryAppCatalog } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import OrderSubmitForm from "@/components/staff/OrderSubmitForm";
import OfflineQueueBanner from "@/components/staff/OfflineQueueBanner";
import { deriveBrandTokens, DEFAULT_BRAND_COLORS } from "@/lib/brandTokens";

export default async function StaffSubmitPage({
  params,
}: {
  params: Promise<{ locale: string; brandSlug: string }>;
}) {
  const { locale, brandSlug } = await params;
  setRequestLocale(locale);

  // 1. Auth check
  const { userId: clerkUserId, role, brandId: sessionBrandId } = await requireAuth(["staff", "brand_admin"]);

  // 2. Resolve Brand
  const brand = await getBrandBySlug(brandSlug);
  const t = await getTranslations("brand.submit");

  if (!brand) notFound();

  // 3. Multi-tenant check
  if (sessionBrandId !== brand.id && role !== 'master_admin') {
    notFound();
  }

  // Derive tokens
  const tokens = deriveBrandTokens(brand.brandColors || DEFAULT_BRAND_COLORS);

  // 4. Fetch User & Branch Info
  const user = await db.query.users.findFirst({
    where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
    with: {
      branch: true,
    },
  });

  if (!user || (!user.branchId && role === 'staff')) {
    // If staff has no branch, they can't submit orders
    return (
      <div 
        style={tokens as any}
        className="flex h-screen flex-col items-center justify-center p-6 text-center bg-[var(--brand-surface)]"
      >
        <h1 className="text-xl font-bold text-[var(--brand-text-accent)] mb-2">
          {t('noBranchTitle')}
        </h1>
        <p className="text-[var(--brand-surface-fg-muted)] mb-6">
          {t('noBranchDesc')}
        </p>
        <SignOutButton signOutOptions={{ redirectUrl: `/${locale}/brands/${brandSlug}/login` }}>
          <button className="text-[var(--brand-primary)] font-semibold">
            {t('signOut')}
          </button>
        </SignOutButton>
      </div>
    );
  }

  // 5. Fetch Delivery Apps for this brand
  const appsResult = await db
    .select({
      id: brandDeliveryApps.id,
      name: deliveryAppCatalog.name,
    })
    .from(brandDeliveryApps)
    .innerJoin(deliveryAppCatalog, eq(brandDeliveryApps.catalogAppId, deliveryAppCatalog.id))
    .where(and(eq(brandDeliveryApps.brandId, brand.id), eq(brandDeliveryApps.isActive, true)))
    .execute();

  return (
    <div style={tokens as any} className="min-h-screen bg-[var(--brand-surface)] text-[var(--brand-surface-fg)]">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[var(--brand-background)] px-4 border-b border-[var(--brand-border)]">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            <div className="relative h-8 w-8">
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--brand-primary)] text-[10px] font-bold text-[var(--brand-primary-fg)]">
              {brand.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold text-[var(--brand-background-fg)] line-clamp-1">{brand.name}</span>
            <span className="text-[10px] font-medium text-[var(--brand-background-fg-muted)] line-clamp-1">
              {user.branch?.name || t('noBranchTitle')}
            </span>
          </div>
        </div>

        <SignOutButton signOutOptions={{ redirectUrl: `/${locale}/brands/${brandSlug}/login` }}>
          <button className="rounded-full p-2 text-[var(--brand-background-fg-muted)] hover:bg-[var(--brand-background-active)] hover:text-[var(--brand-background-fg)] transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </SignOutButton>
      </header>

      <OfflineQueueBanner />

      <main className="mx-auto max-w-md">
        <OrderSubmitForm 
          brandId={brand.id}
          brandSlug={brand.slug}
          apps={appsResult}
        />
      </main>
    </div>
  );
}
