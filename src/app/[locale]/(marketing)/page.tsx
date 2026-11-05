import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { absoluteUrl, localizedPath, pageMetadata } from '@/lib/seo/site';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import HeroSection from '@/components/landing/HeroSection';
import ServicesSection from '@/components/landing/ServicesSection';
import SocialProofBar from '@/components/landing/SocialProofBar';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ValuesSection from '@/components/landing/ValuesSection';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'seo' });

  // The home title already names the brand and carries the value proposition.
  return pageMetadata({
    locale: locale as Locale,
    path: '/',
    title: t('home.title'),
    description: t('home.description'),
    brandedTitle: true,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('seo');

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(t('home.description')),
          websiteJsonLd(locale as Locale, absoluteUrl(localizedPath(locale as Locale, '/'))),
        ]}
      />
      <main id="main">
        <HeroSection />
        <ServicesSection />
        <SocialProofBar />
        <AboutSection />
        <HowItWorksSection />
        <ValuesSection />
      </main>
    </>
  );
}
