import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getBrandBySlug } from "@/lib/queries/brands";
import { deriveBrandTokens } from "@/lib/brandTokens";

/**
 * The staff app of one brand. Installed from the brand's sign-in or order
 * page, it opens straight on the order screen under the brand's name.
 * Public: it holds nothing but the name and colours.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; brandSlug: string }> }) {
  const { locale, brandSlug } = await params;
  const brand = hasLocale(routing.locales, locale) ? await getBrandBySlug(brandSlug) : undefined;
  if (!brand) return new Response("Not found", { status: 404 });

  const background = deriveBrandTokens(brand.brandColors)["--brand-background"];
  const base = `/${locale}/brands/${brand.slug}`;

  return Response.json(
    {
      id: `${base}/submit`,
      name: brand.name,
      short_name: brand.name.slice(0, 12),
      lang: locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      start_url: `${base}/submit`,
      scope: `${base}/`,
      display: "standalone",
      orientation: "portrait",
      background_color: background,
      theme_color: background,
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } }
  );
}
