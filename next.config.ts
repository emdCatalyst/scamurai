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
 * http:// development is never pinned to HTTPS. The Content-Security-Policy is
 * set per request by src/proxy.ts (see src/lib/security/csp.ts).
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

const nextConfig: NextConfig = {
  // Self-contained server for the container image (see Dockerfile).
  output: 'standalone',
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
  // Evaluated at build time. The admin console's stricter headers are added at
  // runtime by src/proxy.ts instead, so the build never needs ADMIN_SLUG.
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default withNextIntl(nextConfig);
