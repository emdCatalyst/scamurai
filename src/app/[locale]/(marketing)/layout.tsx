import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import ClientIntlProvider from '@/components/providers/ClientIntlProvider';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'seo' });
  return { title: { default: t('home.title'), template: t('titleTemplate') } };
}

/**
 * Public marketing site: home, service pages, apply flow. Statically rendered,
 * no auth provider. Only the namespaces used by client components are shipped.
 */
export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <ClientIntlProvider
      namespaces={['nav', 'footer', 'marketing', 'hero', 'socialProof', 'about', 'howItWorks', 'values', 'plans', 'apply', 'services']}
    >
      <Navbar />
      {children}
      <Footer />
    </ClientIntlProvider>
  );
}
