import { Poppins, JetBrains_Mono } from 'next/font/google';

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
});

// Qomra Arabic is loaded via CSS @font-face in globals.css (OTF files in /public/fonts/).
// next/font/local does not support OTF with Turbopack; CSS @font-face is the correct path.
// The CSS variable --font-qomra is registered there and applied per locale.

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
