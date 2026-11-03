import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClientIp } from './ratelimit';

const headers = (values: Record<string, string>) => new Headers(values);

describe('getClientIp', () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads the client from Google's load balancer format, ignoring forged entries", () => {
    // The client sent "6.6.6.6"; the load balancer appended "<client>,<itself>".
    expect(getClientIp(headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7, 34.120.0.1' }))).toBe('203.0.113.7');
    expect(getClientIp(headers({ 'x-forwarded-for': '203.0.113.7,34.120.0.1' }))).toBe('203.0.113.7');
  });

  it('uses the only entry when no proxy appended one', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('follows TRUSTED_PROXY_HOPS', () => {
    const chain = headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7, 10.0.0.2, 10.0.0.3' });
    vi.stubEnv('TRUSTED_PROXY_HOPS', '2');
    expect(getClientIp(chain)).toBe('203.0.113.7');
    vi.stubEnv('TRUSTED_PROXY_HOPS', '0');
    expect(getClientIp(chain)).toBe('10.0.0.3');
    vi.stubEnv('TRUSTED_PROXY_HOPS', 'not-a-number');
    expect(getClientIp(chain)).toBe('10.0.0.2');
  });

  it('falls back to x-real-ip, then to nothing', () => {
    expect(getClientIp(headers({ 'x-real-ip': ' 203.0.113.9 ' }))).toBe('203.0.113.9');
    expect(getClientIp(headers({ 'x-forwarded-for': ' , ' }))).toBeUndefined();
    expect(getClientIp(headers({}))).toBeUndefined();
  });
});
