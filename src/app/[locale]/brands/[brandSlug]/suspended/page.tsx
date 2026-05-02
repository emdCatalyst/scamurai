import { getTranslations } from "next-intl/server";
import { ShieldAlert, Mail, LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLoginBackground } from "@/components/brand/BrandLoginBackground";
import { getBrandBySlug } from "@/lib/queries/brands";
import { notFound } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

export default async function BrandSuspendedPage({
  params,
}: {
  params: Promise<{ brandSlug: string; locale: string }>;
}) {
  const { brandSlug, locale } = await params;
  const brand = await getBrandBySlug(brandSlug);
  const t = await getTranslations("suspended");

  if (!brand) {
    notFound();
  }

  return (
    <BrandLoginBackground>
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-[var(--brand-danger)]/10 rounded-3xl flex items-center justify-center text-[var(--brand-danger)] shadow-sm border border-[var(--brand-danger)]/20">
          <ShieldAlert size={40} strokeWidth={1.5} />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t("title")}
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            {t("message")}
          </p>
        </div>
      </div>

      <div className="pt-8 flex flex-col gap-3">
        <a
          href="mailto:support@scamurai.com"
          className="flex items-center justify-center gap-3 w-full py-3 bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] rounded-lg font-bold hover:brightness-110 transition-all shadow-lg"
          style={{ 
            boxShadow: `0 0 20px rgba(79, 197, 223, 0.3)` // Fallback/base glow
          }}
        >
          <Mail size={18} />
          {t("contactSupport")}
        </a>
        
        <SignOutButton signOutOptions={{ redirectUrl: `/${locale}/brands/${brandSlug}/login` }}>
          <button className="flex items-center justify-center gap-2 text-sm font-bold text-white/40 hover:text-white transition-colors py-2">
            <LogOut size={16} />
            {t("backToLogin")}
          </button>
        </SignOutButton>
      </div>

      <div className="pt-8 text-center border-t border-white/5 mt-4">
        <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
          Powered by <span className="text-white/40">Scamurai</span>
        </p>
      </div>
    </BrandLoginBackground>
  );
}
