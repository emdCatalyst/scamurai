import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { absoluteUrl, buildAlternates, localizedPath } from '@/lib/seo/site';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import HeroSection from '@/components/landing/HeroSection';
import ServicesSection from '@/components/landing/ServicesSection';
import SocialProofBar from '@/components/landing/SocialProofBar';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ValuesSection from '@/components/landing/ValuesSection';
import Vision2030Strip from '@/components/landing/Vision2030Strip';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'seo' });

  return {
    title: { absolute: t('home.title') },
    description: t('home.description'),
    alternates: buildAlternates(locale as Locale, '/'),
    // `images` is inherited from opengraph-image.png in this segment.
    openGraph: {
      url: localizedPath(locale as Locale, '/'),
      title: t('home.title'),
      description: t('home.description'),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('seo');

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(t('siteName'), t('home.description')),
          websiteJsonLd(t('siteName'), locale, absoluteUrl(localizedPath(locale as Locale, '/'))),
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
      <Vision2030Strip />
    </>
  );
}
