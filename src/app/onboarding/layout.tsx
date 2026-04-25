import type { Metadata } from 'next';
import { poppins, mono } from '@/lib/fonts';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Onboarding — Scamurai',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={`${poppins.variable} ${mono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
