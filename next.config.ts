import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const projectRoot = path.resolve(process.cwd());

type HttpHeader = { key: string; value: string };

/**
 * Browser features no page uses are switched off for every frame. Staff photo
 * capture uses <input type="file" capture>, which hands off to the OS camera
 * and is not governed by this policy; change `camera` to `(self)` if in-page
 * capture (getUserMedia) is ever added.
 */
const PERMISSIONS_POLICY = ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()'].join(', ');

/**
 * Baseline headers for every response. HSTS is production-only so local
 * http:// development is never pinned to HTTPS. No Content-Security-Policy yet:
 * Clerk, Cloud Storage and inline styles need an audited allow-list first.
 */
const SECURITY_HEADERS: HttpHeader[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

/** Stricter rules for the admin console; listed after the baseline, so these values win. */
const ADMIN_HEADERS: HttpHeader[] = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
  allowedDevOrigins: ['192.168.1.4'],
  async headers() {
    const adminSlug = process.env.ADMIN_SLUG;

    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      // Admin pages live under a locale prefix (/en/<slug>/…); the optional
      // segment also covers the unprefixed URL that next-intl redirects.
      ...(adminSlug ? [{ source: `/:locale?/${adminSlug}/:path*`, headers: ADMIN_HEADERS }] : []),
    ];
  },
};

export default withNextIntl(nextConfig);
