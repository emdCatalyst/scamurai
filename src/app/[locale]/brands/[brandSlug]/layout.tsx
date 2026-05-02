import { getBrandBySlug } from "@/lib/queries/brands";
import { notFound } from "next/navigation";
import { deriveBrandTokens, DEFAULT_BRAND_COLORS } from "@/lib/brandTokens";
import { BrandColors } from "@/types/brand";

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
      {children}
    </div>
  );
}
