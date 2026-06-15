import './globals.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { poppins, mono } from '@/lib/fonts';

export const metadata: Metadata = {
  title: '404 — Page not found · Scamurai',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${mono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <main
          className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 text-center overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, #0d1e35 0%, #172b49 45%, #0e2a3a 100%)',
          }}
        >
          {/* ambient sky glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(79,197,223,0.22) 0%, transparent 65%)',
            }}
          />

          <Link
            href="/"
            className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-90 hover:opacity-100 transition-opacity"
          >
            <Image
              src="/logos/secondy logo 2.svg"
              alt="Scamurai"
              width={36}
              height={36}
              priority
            />
            <span className="text-offwhite font-bold tracking-tight text-lg">
              Scamurai
            </span>
          </Link>

          <div className="relative z-10 flex flex-col items-center max-w-xl">
            <p
              className="font-mono text-xs uppercase tracking-[0.3em] text-sky/80 mb-6"
              style={{ color: 'rgba(79,197,223,0.9)' }}
            >
              Error 404
            </p>

            <h1
              className="text-[clamp(5rem,18vw,9rem)] font-black leading-none tracking-tighter text-gradient-sky mb-4"
            >
              404
            </h1>

            <h2 className="text-2xl sm:text-3xl font-bold text-offwhite mb-3 tracking-tight">
              This page wandered off the grid.
            </h2>

            <p className="text-base sm:text-lg text-offwhite/70 mb-10 leading-relaxed">
              The link is broken or the page never existed. Let&apos;s get you
              back to safer ground.
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-navy transition-all active:scale-[0.98] glow-sky"
              style={{
                background:
                  'linear-gradient(135deg, #4fc5df 0%, #5cbf8f 100%)',
              }}
            >
              <span>Back to home</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-offwhite/40">
            © {new Date().getFullYear()} Scamurai — The Guardian of Your Orders
          </p>
        </main>
      </body>
    </html>
  );
}
