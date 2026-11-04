import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildContentSecurityPolicy,
  clerkFrontendApiOrigin,
  createNonce,
  cspMode,
  type CspOptions,
} from './csp';

const key = (host: string, kind = 'test') => `pk_${kind}_${Buffer.from(`${host}$`).toString('base64')}`;

const base: CspOptions = {
  frameAncestors: "'self'",
  reportOnly: false,
  isDev: false,
  upgradeInsecureRequests: true,
  clerkOrigin: 'https://example-app-12.clerk.accounts.dev',
  clerkTelemetry: false,
};

/** Parses "a x y; b z" into { a: ['x', 'y'], b: ['z'] }. */
function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy.split('; ').map((part) => {
      const [name, ...values] = part.split(' ');
      return [name, values];
    })
  );
}

describe('clerkFrontendApiOrigin', () => {
  it('decodes the Frontend API host from development and production keys', () => {
    expect(clerkFrontendApiOrigin(key('example-app-12.clerk.accounts.dev'))).toBe('https://example-app-12.clerk.accounts.dev');
    expect(clerkFrontendApiOrigin(key('clerk.scamurai.com', 'live'))).toBe('https://clerk.scamurai.com');
  });

  it('rejects anything that is not a plain host name', () => {
    expect(clerkFrontendApiOrigin(undefined)).toBeNull();
    expect(clerkFrontendApiOrigin('sk_test_abc')).toBeNull();
    expect(clerkFrontendApiOrigin(key("evil.com; script-src *"))).toBeNull();
    expect(clerkFrontendApiOrigin(key('localhost'))).toBeNull();
  });
});

describe('buildContentSecurityPolicy', () => {
  it('uses a nonce and strict-dynamic for pages rendered per request', () => {
    const csp = directives(buildContentSecurityPolicy({ ...base, nonce: 'abc123' }));
    expect(csp['script-src']).toEqual(expect.arrayContaining(["'self'", "'nonce-abc123'", "'strict-dynamic'"]));
    expect(csp['script-src']).not.toContain("'unsafe-inline'");
  });

  it('allows inline scripts, but only listed origins, on prerendered pages', () => {
    const csp = directives(buildContentSecurityPolicy(base));
    expect(csp['script-src']).toContain("'unsafe-inline'");
    expect(csp['script-src']).not.toContain("'strict-dynamic'");
    expect(csp['script-src']).toContain('https://example-app-12.clerk.accounts.dev');
  });

  it('lists what Clerk and signed Cloud Storage URLs need', () => {
    const csp = directives(buildContentSecurityPolicy(base));
    expect(csp['connect-src']).toEqual(
      expect.arrayContaining(["'self'", 'https://example-app-12.clerk.accounts.dev', 'https://storage.googleapis.com'])
    );
    expect(csp['img-src']).toEqual(expect.arrayContaining(['blob:', 'https://img.clerk.com', 'https://storage.googleapis.com']));
    expect(csp['frame-src']).toEqual(['https://challenges.cloudflare.com']);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['frame-ancestors']).toEqual(["'self'"]);
    expect(csp['report-uri']).toEqual(['/api/csp-report']);
  });

  it('adds eval only in development and telemetry only for development Clerk instances', () => {
    expect(directives(buildContentSecurityPolicy(base))['script-src']).not.toContain("'unsafe-eval'");
    expect(directives(buildContentSecurityPolicy({ ...base, isDev: true }))['script-src']).toContain("'unsafe-eval'");
    expect(directives(buildContentSecurityPolicy({ ...base, clerkTelemetry: true }))['connect-src']).toContain(
      'https://clerk-telemetry.com'
    );
  });

  it('leaves out what a report-only policy cannot carry', () => {
    const enforced = directives(buildContentSecurityPolicy({ ...base, frameAncestors: "'none'" }));
    expect(enforced['frame-ancestors']).toEqual(["'none'"]);
    expect(enforced).toHaveProperty('upgrade-insecure-requests');

    const reportOnly = directives(buildContentSecurityPolicy({ ...base, reportOnly: true }));
    expect(reportOnly).not.toHaveProperty('frame-ancestors');
    expect(reportOnly).not.toHaveProperty('upgrade-insecure-requests');
  });
});

describe('cspMode and createNonce', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('defaults to enforce', () => {
    expect(cspMode()).toBe('enforce');
    vi.stubEnv('CSP_MODE', 'Report-Only');
    expect(cspMode()).toBe('report-only');
    vi.stubEnv('CSP_MODE', 'off');
    expect(cspMode()).toBe('off');
    vi.stubEnv('CSP_MODE', 'nonsense');
    expect(cspMode()).toBe('enforce');
  });

  it('creates a fresh 128-bit nonce each time', () => {
    const nonce = createNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(nonce);
  });
});
