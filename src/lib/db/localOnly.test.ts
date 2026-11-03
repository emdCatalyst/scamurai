import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertLocalDatabaseUrl } from './localOnly';

describe('assertLocalDatabaseUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('accepts databases on this machine', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      const url = `postgresql://u:p@${host}:54320/scamurai`;
      expect(assertLocalDatabaseUrl(url, 'the seed')).toBe(url);
    }
  });

  it('refuses remote hosts, a missing URL and production', () => {
    expect(() => assertLocalDatabaseUrl('postgresql://u:p@10.20.0.3/scamurai', 'the seed')).toThrow(/10\.20\.0\.3/);
    expect(() => assertLocalDatabaseUrl(undefined, 'the seed')).toThrow(/DATABASE_URL is not set/);
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => assertLocalDatabaseUrl('postgresql://u:p@localhost/scamurai', 'the seed')).toThrow(/Refusing/);
  });
});
