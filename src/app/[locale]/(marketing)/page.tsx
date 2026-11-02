import { setRequestLocale } from 'next-intl/server';
import HeroSection from '@/components/landing/HeroSection';
import SocialProofBar from '@/components/landing/SocialProofBar';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ValuesSection from '@/components/landing/ValuesSection';
import PlansSection from '@/components/landing/PlansSection';
import Vision2030Strip from '@/components/landing/Vision2030Strip';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <main>
        <HeroSection />
        <SocialProofBar />
        <AboutSection />
        <HowItWorksSection />
        <ValuesSection />
        <PlansSection />
      </main>
      <Vision2030Strip />
    </>
  );
}
