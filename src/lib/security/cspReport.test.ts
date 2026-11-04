import { describe, expect, it } from 'vitest';
import { parseCspReports } from './cspReport';

const SLUG = 'secret-admin-path';

describe('parseCspReports', () => {
  it('reads the report-uri format', () => {
    const payload = {
      'csp-report': {
        'document-uri': 'https://scamurai.com/en/brands/demo/orders?tab=open',
        'violated-directive': "script-src-elem 'self' 'nonce-x'",
        'effective-directive': 'script-src-elem',
        'blocked-uri': 'https://evil.example/x.js?token=abc',
        disposition: 'enforce',
      },
    };
    expect(parseCspReports(payload)).toEqual([
      {
        directive: 'script-src-elem',
        blocked: 'https://evil.example/x.js',
        page: 'https://scamurai.com/en/brands/demo/orders',
        source: undefined,
        line: undefined,
        disposition: 'enforce',
      },
    ]);
  });

  it('reads the Reporting API format and skips other report types', () => {
    const payload = [
      { type: 'deprecation', body: { id: 'x' } },
      {
        type: 'csp-violation',
        body: {
          documentURL: `https://scamurai.com/ar/${SLUG}/dashboard`,
          effectiveDirective: 'img-src',
          blockedURL: 'https://storage.googleapis.com/bucket/a.jpg?X-Goog-Signature=secret',
          sourceFile: 'https://scamurai.com/_next/static/chunks/app.js',
          lineNumber: 12,
          disposition: 'report',
        },
      },
    ];
    expect(parseCspReports(payload, SLUG)).toEqual([
      {
        directive: 'img-src',
        blocked: 'https://storage.googleapis.com/bucket/a.jpg',
        page: 'https://scamurai.com/ar/<admin>/dashboard',
        source: 'https://scamurai.com/_next/static/chunks/app.js',
        line: 12,
        disposition: 'report',
      },
    ]);
  });

  it('keeps keywords, drops browser-extension noise and caps the count', () => {
    const report = (blocked: string) => ({ type: 'csp-violation', body: { effectiveDirective: 'script-src', blockedURL: blocked } });
    expect(parseCspReports([report('inline')])[0].blocked).toBe('inline');
    expect(parseCspReports([report('blob:https://scamurai.com/1')])[0].blocked).toBe('blob:');
    expect(parseCspReports([report('chrome-extension://abc/inject.js')])).toEqual([]);
    expect(parseCspReports(Array.from({ length: 50 }, () => report('inline')))).toHaveLength(10);
  });

  it('ignores anything else', () => {
    for (const payload of [null, 'text', 42, {}, { 'csp-report': 'x' }, [{ type: 'csp-violation' }]]) {
      expect(parseCspReports(payload)).toEqual([]);
    }
  });
});
