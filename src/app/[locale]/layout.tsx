import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { poppins, mono } from '@/lib/fonts';
import { getSiteUrl, OG_LOCALE, otherLocales } from '@/lib/seo/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'seo' });
  const siteName = t('siteName');

  return {
    metadataBase: getSiteUrl(),
    applicationName: siteName,
    // Title template is set by the marketing layout so product pages keep their own titles.
    title: t('home.title'),
    description: t('home.description'),
    openGraph: {
      type: 'website',
      siteName,
      locale: OG_LOCALE[locale],
      alternateLocale: otherLocales(locale).map((l) => OG_LOCALE[l]),
    },
    twitter: { card: 'summary_large_image' },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: '#0d1e35',
};

/**
 * Root layout: document shell only, with no client JavaScript of its own.
 * Product providers (Clerk, full message catalogue, toasts) live in the
 * authenticated route groups — see AppProviders — and marketing pages pick the
 * few namespaces they need — see ClientIntlProvider.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale as Locale);

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${poppins.variable} ${mono.variable} antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
