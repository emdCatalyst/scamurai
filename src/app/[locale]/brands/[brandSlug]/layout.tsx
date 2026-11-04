import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getBrandBySlug } from "@/lib/queries/brands";
import { notFound } from "next/navigation";
import { deriveBrandTokens, DEFAULT_BRAND_COLORS } from "@/lib/brandTokens";
import { BrandColors } from "@/types/brand";
import AppProviders from "@/components/providers/AppProviders";
import ServiceWorker from "@/components/staff/ServiceWorker";
import { NO_INDEX } from "@/lib/seo/site";

/** Each brand is its own installable staff app (see manifest.webmanifest/route.ts). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; brandSlug: string }>;
}): Promise<Metadata> {
  const { locale, brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  return {
    robots: NO_INDEX,
    manifest: `/${locale}/brands/${brandSlug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: brand?.name, statusBarStyle: "black-translucent" },
    icons: { apple: "/icons/apple-touch-icon.png" },
  };
}

/**
 * Staff only reach the order screen, the password change and sign-in, so they
 * get just those texts instead of the whole catalogue: less to download and
 * parse on old phones.
 */
const STAFF_MESSAGES = {
  namespaces: ["brand", "suspended"],
  select: {
    brand: ({ submit, changePassword, login }: Record<string, unknown>) => ({ submit, changePassword, login }),
  },
} as const;

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);

  if (!brand) {
    notFound();
  }

  const { sessionClaims } = await auth();
  const isStaff = sessionClaims?.metadata?.role === "staff";

  const brandColors = (brand.brandColors as BrandColors) || DEFAULT_BRAND_COLORS;
  const tokens = deriveBrandTokens(brandColors);

  const cssVars = `
    :root {
      ${Object.entries(tokens)
        .map(([key, value]) => `${key}: ${value};`)
        .join("\n      ")}
    }
  `;

  return (
    <div className="min-h-screen bg-[var(--brand-background)] font-poppins antialiased">
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <ServiceWorker />
      <AppProviders messages={isStaff ? STAFF_MESSAGES : undefined}>{children}</AppProviders>
    </div>
  );
}
