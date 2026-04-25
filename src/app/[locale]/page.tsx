import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import SocialProofBar from '@/components/landing/SocialProofBar';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ValuesSection from '@/components/landing/ValuesSection';
import PlansSection from '@/components/landing/PlansSection';
import Vision2030Strip from '@/components/landing/Vision2030Strip';
import Footer from '@/components/landing/Footer';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <SocialProofBar />
        <AboutSection />
        <HowItWorksSection />
        <ValuesSection />
        <PlansSection />
      </main>
      <Vision2030Strip />
      <Footer />
    </>
  );
}
