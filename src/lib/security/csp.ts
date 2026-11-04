/**
 * Content-Security-Policy, set per request by src/proxy.ts.
 *
 * Two variants share one list of allowed sources:
 *   - Signed-in areas (admin console, brand portals, onboarding) are rendered
 *     per request, so their scripts carry a fresh nonce ('strict-dynamic'):
 *     an injected <script> can't run.
 *   - Public pages are prerendered at build time, where no nonce exists, so
 *     they allow inline scripts but still only load from the listed origins.
 *
 * Both list Clerk's origins, because a client-side navigation from a public
 * page into a portal keeps the first page's policy.
 *
 * CSP_MODE: enforce (default) | report-only | off. Violations are reported to
 * CSP_REPORT_PATH either way, through `report-uri`: every browser sends it
 * right away, while adding `report-to` would make Chrome switch to the batched
 * Reporting API and ignore `report-uri`.
 */

export type CspMode = 'enforce' | 'report-only' | 'off';

export const CSP_REPORT_PATH = '/api/csp-report';

/** Clerk's bot protection (Cloudflare Turnstile): script and iframe. */
const CLOUDFLARE_CHALLENGES = 'https://challenges.cloudflare.com';
const CLERK_IMAGES = 'https://img.clerk.com';
/** Development Clerk instances send telemetry from the browser. */
const CLERK_TELEMETRY = ['https://clerk-telemetry.com', 'https://*.clerk-telemetry.com'];
/** Signed URLs: staff phones upload order photos here, finance views them from here. */
const CLOUD_STORAGE = 'https://storage.googleapis.com';

/** Directives a report-only policy can't carry (browsers ignore them with a warning). */
const ENFORCE_ONLY_DIRECTIVES = new Set(['frame-ancestors', 'upgrade-insecure-requests']);

export interface CspOptions {
  /** Per-request nonce for rendered-per-request pages; omit for prerendered pages. */
  nonce?: string;
  frameAncestors: "'none'" | "'self'";
  reportOnly: boolean;
  /** Development server: React needs eval for its debugging aids. */
  isDev: boolean;
  /** Production over HTTPS. */
  upgradeInsecureRequests: boolean;
  /** Clerk's Frontend API origin (see clerkFrontendApiOrigin). */
  clerkOrigin: string | null;
  clerkTelemetry: boolean;
}

export function cspMode(): CspMode {
  const mode = process.env.CSP_MODE?.trim().toLowerCase();
  return mode === 'report-only' || mode === 'off' ? mode : 'enforce';
}

export function cspHeaderName(mode: Exclude<CspMode, 'off'>): string {
  return mode === 'report-only' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
}

export function createNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
}

/**
 * Clerk's Frontend API origin, decoded from the publishable key
 * (`pk_test_` or `pk_live_` + base64 of `<host>$`). It differs between the
 * development and production instances, so it is never hard-coded.
 */
export function clerkFrontendApiOrigin(publishableKey: string | undefined): string | null {
  const encoded = publishableKey?.match(/^pk_(?:test|live)_([A-Za-z0-9+/=]+)$/)?.[1];
  if (!encoded) return null;
  const host = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? `https://${host}` : null;
}

export function buildContentSecurityPolicy(options: CspOptions): string {
  const clerk = options.clerkOrigin ? [options.clerkOrigin] : [];
  const scriptSrc = [
    "'self'",
    ...(options.nonce ? [`'nonce-${options.nonce}'`, "'strict-dynamic'"] : ["'unsafe-inline'"]),
    ...clerk,
    CLOUDFLARE_CHALLENGES,
    ...(options.isDev ? ["'unsafe-eval'"] : []),
  ];

  const directives: [name: string, values: string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', scriptSrc],
    // Inline style attributes (React, framer-motion, Clerk, brand colors) can't carry a nonce.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', CLERK_IMAGES, CLOUD_STORAGE]],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...clerk, CLERK_IMAGES, CLOUD_STORAGE, ...(options.clerkTelemetry ? CLERK_TELEMETRY : [])]],
    ['frame-src', [CLOUDFLARE_CHALLENGES]],
    ['worker-src', ["'self'", 'blob:']],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', [options.frameAncestors]],
    ...(options.upgradeInsecureRequests ? [['upgrade-insecure-requests', []] as [string, string[]]] : []),
    ['report-uri', [CSP_REPORT_PATH]],
  ];

  return directives
    .filter(([name]) => !(options.reportOnly && ENFORCE_ONLY_DIRECTIVES.has(name)))
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
}
