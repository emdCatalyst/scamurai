import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { fontVariables } from '@/lib/fonts';
import { baseOpenGraph, getSiteUrl, shareImage, SITE_NAME } from '@/lib/seo/site';

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

  // Defaults for every page in this language; public pages replace title,
  // description, canonical and cards with their own (pageMetadata).
  return {
    metadataBase: getSiteUrl(),
    applicationName: SITE_NAME[locale],
    title: t('home.title'),
    description: t('home.description'),
    openGraph: baseOpenGraph(locale),
    twitter: { card: 'summary_large_image', images: [shareImage(locale)] },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: '#0B0B0B',
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
      className={`${fontVariables} antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
