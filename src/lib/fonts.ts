import { Poppins, JetBrains_Mono } from 'next/font/google';

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  // The root layout serves both languages, so a preload would fetch all six weights on Arabic
  // pages too, which are set in Qomra: ~47 KB more on the staff screen's weak connections.
  // English pages fetch the weights they use, with a size-matched fallback meanwhile.
  preload: false,
  variable: '--font-poppins',
  display: 'swap',
});

// Qomra Arabic is loaded via CSS @font-face in globals.css (OTF files in /public/fonts/).
// next/font/local does not support OTF with Turbopack; CSS @font-face is the correct path.
// The CSS variable --font-qomra is registered there and applied per locale.

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  // Used only in a few places (watermarks, product UI); don't preload it on every page.
  preload: false,
  variable: '--font-mono',
  display: 'swap',
});
