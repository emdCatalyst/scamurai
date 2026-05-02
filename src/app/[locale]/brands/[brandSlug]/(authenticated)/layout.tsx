import { requireAuth } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/queries/brands";
import { notFound } from "next/navigation";
import BrandShell from "@/components/brand/BrandShell";

export default async function AuthenticatedBrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; brandSlug: string }>;
}) {
  const { brandSlug, locale } = await params;
  
  // 1. Protection & Identity
  const { brandId: userBrandId, role, userId } = await requireAuth(["brand_admin", "finance", "staff"]);
  
  // 2. Resolve Brand
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  // 3. Security check: ensure user belongs to this brand
  if (userBrandId !== brand.id) {
    // This is a safety net; requireAuth already checks this in a real scenario,
    // but here we double check against the slug for multi-tenant isolation.
    notFound();
  }

  // 4. Get User Details (Clerk)
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const clerkUser = await currentUser();
  
  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || "";
  const userAvatar = clerkUser?.imageUrl || "";

  return (
    <BrandShell
      locale={locale}
      brandSlug={brandSlug}
      brandName={brand.name}
      brandLogo={brand.logoUrl}
      userEmail={userEmail}
      userAvatar={userAvatar}
      userRole={role}
    >
      {children}
    </BrandShell>
  );
}
