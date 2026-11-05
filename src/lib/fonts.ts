import { Amiri, IBM_Plex_Sans_Arabic } from 'next/font/google';

/**
 * IBM Plex Sans Arabic sets all body text, UI, numbers and buttons in both
 * languages. Not preloaded: a preload fetches every weight × subset (8 files)
 * on every page, while unicode-range lets each page fetch only the files it
 * renders, which matters on the staff screen's weak connections. The
 * size-matched fallback keeps the swap from shifting the layout.
 */
export const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  preload: false,
  variable: '--font-plex',
  display: 'swap',
});

/** Amiri Bold: English display headings only, so only its Latin subset. */
export const amiri = Amiri({
  subsets: ['latin'],
  weight: ['700'],
  preload: false,
  variable: '--font-amiri',
  display: 'swap',
});

/** Class names that register both font variables on <html>. */
export const fontVariables = `${plex.variable} ${amiri.variable}`;
