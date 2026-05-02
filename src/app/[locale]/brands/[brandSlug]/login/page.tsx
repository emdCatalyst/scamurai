import { getBrandBySlug } from "@/lib/queries/brands";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { BrandLoginForm } from "@/components/brand/BrandLoginForm";
import { BrandSuspensionNotice } from "@/components/brand/BrandSuspensionNotice";
import { BrandLoginBackground } from "@/components/brand/BrandLoginBackground";
import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { handleBrandLoginRedirect } from "@/actions/handleBrandLoginRedirect";
import Link from "next/link";

export default async function BrandLoginPage({
  params,
}: {
  params: Promise<{ brandSlug: string; locale: string }>;
}) {
  const { brandSlug, locale } = await params;
  
  // Safety net: If already signed in, redirect to dashboard immediately
  const { userId } = await auth();
  if (userId) {
    const redirectRes = await handleBrandLoginRedirect(brandSlug);
    if (redirectRes.success && redirectRes.target) {
      redirect(`/${locale}${redirectRes.target}`);
    } else if (!redirectRes.success) {
      if (redirectRes.error === "inactive") {
        redirect(`/${locale}/brands/${brandSlug}/inactive`);
      } else if (redirectRes.error === "suspended") {
        redirect(`/${locale}/brands/${brandSlug}/suspended`);
      }
    }
  }

  const brand = await getBrandBySlug(brandSlug);
  const t = await getTranslations("brand.login");

  if (!brand) {
    notFound();
  }

  const isSuspended = !brand.isActive;

  return (
    <BrandLoginBackground>
      <div className="flex flex-col items-center mb-8">
        {brand.logoUrl ? (
          <div className="relative w-32 h-32 mb-2">
            <Image
              src={brand.logoUrl}
              alt={brand.name}
              fill
              className="object-contain"
              priority
            />
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center mb-2">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
              {brand.name}
            </h1>
          </div>
        )}
        {!isSuspended && <h2 className="text-[var(--brand-primary)] text-xs font-bold tracking-widest uppercase">
          {t('title')}
        </h2>}
      </div>

      {isSuspended ? (
        <BrandSuspensionNotice />
      ) : (
        <BrandLoginForm brandSlug={brandSlug} />
      )}

      {!isSuspended && (
        <div className="pt-8 text-center">
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
            {t('poweredBy')} <Link href={"/"}>Scamurai</Link>
          </p>
        </div>
      )}
    </BrandLoginBackground>
  );
}
