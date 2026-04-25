'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe, MessageCircle, Mail, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => router.replace(pathname, { locale: isAr ? 'en' : 'ar' });

  const productLinks = [
    { label: t('features'), href: '#how' },
    { label: t('pricing'), href: '#plans' },
    { label: t('security'), href: '#' },
    { label: t('updates'), href: '#' },
  ];

  const companyLinks = [
    { label: t('aboutLink'), href: '#about' },
    { label: t('contact'), href: '#' },
    { label: t('privacy'), href: '#' },
    { label: t('terms'), href: '#' },
  ];

  return (
    <footer
      className="relative overflow-hidden border-t border-white/[0.06]"
      style={{ background: 'linear-gradient(180deg, #0a1625 0%, #060e1a 100%)' }}
    >
      {/* Top glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky/20 to-transparent" />

      {/* Ghosted logo watermark */}
      <div className="pointer-events-none absolute end-0 top-0 h-full w-1/3 opacity-[0.015]" aria-hidden>
        <Image src="/logos/secondy logo 2.svg" alt="" fill className="object-contain object-end" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="flex flex-col gap-5 lg:col-span-1">
            <div className="flex items-center gap-1.5">
              <Image src="/logos/secondy logo 2.svg" alt="Scamurai" width={38} height={38} className="opacity-80" />
              <Image src="/logos/primary logo 2.svg" alt="SCAMURAI" width={100} height={16} className="opacity-70" />
            </div>

            <p className={`text-sm leading-relaxed text-white/35 ${isAr ? 'font-arabic' : ''}`}>
              {t('tagline')}
            </p>

            <div className="flex gap-3">
              {[Globe, MessageCircle, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/30 transition-all hover:border-sky/30 hover:text-sky hover:bg-sky/[0.06]"
                >
                  <Icon size={15} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className={`mb-5 text-xs font-bold uppercase tracking-widest text-white/40 ${isAr ? 'font-arabic' : ''}`}>
              {t('product')}
            </h4>
            <ul className="flex flex-col gap-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className={`text-sm text-white/40 transition-colors hover:text-white/80 ${isAr ? 'font-arabic' : ''}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className={`mb-5 text-xs font-bold uppercase tracking-widest text-white/40 ${isAr ? 'font-arabic' : ''}`}>
              {t('company')}
            </h4>
            <ul className="flex flex-col gap-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className={`text-sm text-white/40 transition-colors hover:text-white/80 ${isAr ? 'font-arabic' : ''}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4 className={`mb-2 text-sm font-bold text-white/80 ${isAr ? 'font-arabic' : ''}`}>
              {t('ctaHeading')}
            </h4>
            <div className="mt-5 flex overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
              <input
                type="email"
                placeholder={t('emailPlaceholder')}
                className={`min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none ${isAr ? 'font-arabic text-end' : ''}`}
                dir={isAr ? 'rtl' : 'ltr'}
              />
              <button className="shrink-0 bg-gradient-cta px-4 font-semibold text-sm text-navy transition-all hover:brightness-110">
                <ArrowRight size={16} strokeWidth={2} className={isAr ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.05] pt-8 sm:flex-row">
          <p className={`text-xs text-white/25 ${isAr ? 'font-arabic' : ''}`}>{t('copyright')}</p>

          <button
            onClick={switchLocale}
            className="flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] h-8 w-8 text-[11px] font-bold text-white/40 transition-all hover:border-sky/30 hover:text-sky"
          >
            {t('langLabel')}
          </button>
        </div>
      </div>
    </footer>
  );
}
