import { after } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/** Public application form: 3 submissions per client IP per 24 hours (sliding window). */
let applicationLimiter: Ratelimit | undefined;

/** Created on first use, so development and tests never build a Redis client. */
function getApplicationLimiter(): Ratelimit {
  applicationLimiter ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(3, '24 h'),
    analytics: true,
    prefix: '@upstash/ratelimit/scamurai',
  });
  return applicationLimiter;
}

/**
 * The client's IP address: the first `x-forwarded-for` entry (the original
 * client; later entries are proxies), falling back to `x-real-ip`. This relies
 * on the platform proxy setting the header itself, as Vercel does; behind a
 * proxy that appends to a client-sent header the first entry is spoofable.
 */
export function getClientIp(headerList: Pick<Headers, 'get'>): string | undefined {
  const forwarded = headerList.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headerList.get('x-real-ip')?.trim() || undefined;
}

/**
 * Whether this client has used up its application allowance. Enforced in
 * production only, and fails open: if Redis is unreachable or misconfigured
 * the request is let through, because losing a real lead costs more than a
 * few extra submissions. Requests without an IP share one bucket.
 */
export async function isApplicationRateLimited(headerList: Pick<Headers, 'get'>): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return false;

  try {
    const { success, pending } = await getApplicationLimiter().limit(getClientIp(headerList) ?? 'unknown');
    // Analytics are written in the background; keep the function alive until they land.
    after(pending);
    return !success;
  } catch (err) {
    console.error('[ratelimit] Application limit check failed; allowing the request:', err);
    return false;
  }
}
