import { CSP_REPORT_PATH } from './csp';

/**
 * Cross-site request forgery guard for the API, run by src/proxy.ts.
 *
 * Browsers name the origin of the page that sent a request in `Origin`. A
 * write to /api/* from another site's page (or from a sandboxed frame, whose
 * origin is "null") is refused, so it can't act with a signed-in user's
 * session even where the session cookie's SameSite setting would let it
 * through. Requests without `Origin` pass: current browsers send it with
 * every write, so those come from servers and scripts, which hold no user's
 * cookies.
 *
 * The rule is the one Next.js applies to Server Actions: the origin's host
 * must equal the first `x-forwarded-host`, else `host`.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Posted to without a session: by other servers (webhooks), and by browsers
 * reporting on a page (CSP), which send `Origin: null` from pages with
 * `Referrer-Policy: no-referrer` such as the admin console.
 */
function isExempt(pathname: string): boolean {
  return pathname.startsWith('/api/webhooks/') || pathname === CSP_REPORT_PATH;
}

/** Whether `origin` names `host`, ignoring letter case and the scheme's default port. */
function isSameHost(origin: string, host: string): boolean {
  try {
    const url = new URL(origin);
    return url.host === new URL(`${url.protocol}//${host}`).host;
  } catch {
    return false; // "null", or not a URL at all
  }
}

export function isCrossSiteApiWrite(method: string, pathname: string, headers: Pick<Headers, 'get'>): boolean {
  if (!pathname.startsWith('/api/') || SAFE_METHODS.has(method.toUpperCase()) || isExempt(pathname)) return false;
  const origin = headers.get('origin');
  if (origin === null) return false;
  const host = headers.get('x-forwarded-host')?.split(',')[0].trim() || headers.get('host');
  return !host || !isSameHost(origin, host);
}
