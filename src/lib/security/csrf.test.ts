import { describe, expect, it } from 'vitest';
import { isCrossSiteApiWrite } from './csrf';

const HOST = 'scamurai.com';
const from = (origin: string | null, host: string | null = HOST, forwardedHost?: string) =>
  new Headers({
    ...(origin !== null && { origin }),
    ...(host !== null && { host }),
    ...(forwardedHost && { 'x-forwarded-host': forwardedHost }),
  });

describe('isCrossSiteApiWrite', () => {
  it("refuses API writes from another site's page or a sandboxed frame", () => {
    for (const origin of ['https://evil.example', 'https://scamurai.com.evil.example', 'https://scamurai.com:8443', 'null', 'garbage']) {
      expect(isCrossSiteApiWrite('POST', '/api/orders/upload-urls', from(origin))).toBe(true);
    }
    expect(isCrossSiteApiWrite('PATCH', '/api/orders/1/confirm', from('https://evil.example'))).toBe(true);
    expect(isCrossSiteApiWrite('PUT', '/api/storage/local', from('https://evil.example'))).toBe(true);
    expect(isCrossSiteApiWrite('DELETE', '/api/anything', from('https://evil.example'))).toBe(true);
    // Nothing to compare the origin with.
    expect(isCrossSiteApiWrite('POST', '/api/staff-telemetry', from('https://scamurai.com', null))).toBe(true);
  });

  it("lets the site's own pages write, also behind a proxy", () => {
    expect(isCrossSiteApiWrite('POST', '/api/orders/upload-urls', from('https://scamurai.com'))).toBe(false);
    expect(isCrossSiteApiWrite('POST', '/api/orders/upload-urls', from('https://scamurai.com', 'Scamurai.com:443'))).toBe(false);
    expect(isCrossSiteApiWrite('PUT', '/api/storage/local', from('http://192.168.1.4:3000', '192.168.1.4:3000'))).toBe(false);
    expect(
      isCrossSiteApiWrite('POST', '/api/upload-logo', from('https://scamurai.com', 'scamurai-web-x.a.run.app', 'scamurai.com, lb.internal'))
    ).toBe(false);
    // Like Server Actions, a forwarded host takes precedence over `host`.
    expect(isCrossSiteApiWrite('POST', '/api/upload-logo', from('https://scamurai.com', HOST, 'other.example'))).toBe(true);
  });

  it('leaves reads, requests without Origin, webhooks, CSP reports and pages alone', () => {
    const evil = from('https://evil.example');
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(isCrossSiteApiWrite(method, '/api/orders/1/signed-urls', evil)).toBe(false);
    }
    expect(isCrossSiteApiWrite('POST', '/api/orders/upload-urls', from(null))).toBe(false);
    expect(isCrossSiteApiWrite('POST', '/api/webhooks/clerk', evil)).toBe(false);
    expect(isCrossSiteApiWrite('POST', '/api/csp-report', from('null'))).toBe(false);
    // Server Actions post to pages, and Next.js checks their origin itself.
    expect(isCrossSiteApiWrite('POST', '/en/brands/demo/settings', evil)).toBe(false);
  });
});
