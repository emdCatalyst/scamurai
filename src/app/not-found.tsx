import './globals.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { poppins } from '@/lib/fonts';
import { NO_INDEX } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: '404 — Scamurai | سكامورائي',
  robots: NO_INDEX,
};

/**
 * Fallback for URLs outside any locale. There is no app/layout.tsx, so Next.js
 * renders this boundary around every route and wraps it in a bare <html>.
 *
 * It must not read the request: resolving the visitor's locale here (headers)
 * turns every page in the app dynamic, including the static marketing pages.
 * It therefore shows both languages with explicit locales, and "/" lets the
 * proxy send the visitor to their language.
 */
export default async function RootNotFound() {
  const copies = await Promise.all(
    routing.locales.map(async (locale) => ({
      locale,
      t: await getTranslations({ locale, namespace: 'common.notFound' }),
    }))
  );

  return (
    <main
      className={cn(
        poppins.variable,
        'flex min-h-screen flex-col items-center justify-center bg-navy-deep px-6 py-24 text-center antialiased'
      )}
    >
      <Image src="/logos/secondy logo 2.svg" alt="" width={72} height={72} />
      <h1 className="mt-8 font-mono text-6xl font-black text-white">404</h1>

      <div className="mt-8 grid max-w-3xl gap-8 sm:grid-cols-2">
        {copies.map(({ locale, t }) => (
          <div key={locale} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={locale === 'ar' ? 'font-arabic' : 'font-sans'}>
            <p className="text-xl font-bold text-white">{t('title')}</p>
            <p className="mt-3 text-pretty text-base leading-relaxed text-white/70">{t('description')}</p>
          </div>
        ))}
      </div>

      <Link
        href="/"
        className="mt-10 inline-flex items-center justify-center rounded-full bg-gradient-cta px-8 py-4 text-base font-semibold text-navy shadow-glow-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
      >
        {copies.map(({ locale, t }) => (
          <span key={locale} lang={locale} className={cn(locale === 'ar' && 'font-arabic')}>
            {t('backHome')}
          </span>
        )).reduce<React.ReactNode[]>((parts, part, index) => (index === 0 ? [part] : [...parts, ' · ', part]), [])}
      </Link>
    </main>
  );
}
