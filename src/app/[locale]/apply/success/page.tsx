import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import ApplicationSuccess from '@/components/onboarding/ApplicationSuccess';

export const metadata: Metadata = {
  title: 'Application Submitted — Scamurai',
  description: 'Your application has been received. Our team will contact you within 24 hours.',
};

export default async function ApplySuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main
        className="relative min-h-screen flex items-center justify-center py-32 px-4"
        style={{
          background:
            'linear-gradient(180deg, #0d1e35 0%, #060f1a 50%, #0d1e35 100%)',
        }}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute top-1/4 start-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-15"
            style={{
              background:
                'radial-gradient(ellipse, rgba(92,191,143,0.3) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        <div className="relative z-10 w-full">
          <ApplicationSuccess email="" />
        </div>
      </main>
      <Footer />
    </>
  );
}
