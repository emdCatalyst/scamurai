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
 * How many `x-forwarded-for` entries our own infrastructure appends after the
 * client's address. Google Cloud's external Application Load Balancer appends
 * `<client-ip>,<load-balancer-ip>` to whatever the client sent, so the client
 * is 1 entry from the end. Set TRUSTED_PROXY_HOPS if the hosting changes.
 */
const DEFAULT_TRUSTED_PROXY_HOPS = 1;

function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS?.trim();
  const hops = raw ? Number(raw) : DEFAULT_TRUSTED_PROXY_HOPS;
  return Number.isInteger(hops) && hops >= 0 ? hops : DEFAULT_TRUSTED_PROXY_HOPS;
}

/**
 * The client's IP address, read from the right of `x-forwarded-for`: entries
 * further left were sent by the client and can be forged. With fewer entries
 * than expected (no proxy in front), the first one is used. Falls back to
 * `x-real-ip`.
 */
export function getClientIp(headerList: Pick<Headers, 'get'>, hops = trustedProxyHops()): string | undefined {
  const entries = (headerList.get('x-forwarded-for') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const forwarded = entries[Math.max(0, entries.length - 1 - hops)];
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

/**
 * A limit per key (a signed-in user), counted in this server's memory: no
 * network call, so it can sit on the staff upload path. Each instance counts
 * on its own, so the real ceiling is the limit times the instances running.
 * Fixed windows; windows that ended are dropped once per window.
 */
export function createMemoryRateLimit({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { start: number; count: number }>();
  let sweptAt = 0;

  /** Counts a request; true once `key` went over `limit` in the current window. */
  return function isLimited(key: string, now = Date.now()): boolean {
    if (now - sweptAt >= windowMs) {
      for (const [other, window] of windows) if (now - window.start >= windowMs) windows.delete(other);
      sweptAt = now;
    }
    const window = windows.get(key);
    if (!window || now - window.start >= windowMs) {
      windows.set(key, { start: now, count: 1 });
      return false;
    }
    window.count += 1;
    return window.count > limit;
  };
}

const TEN_MINUTES = 10 * 60_000;

/**
 * The staff APIs, per signed-in user: one upload-urls and one confirm per
 * order, far more than a worker sends in a rush. They stop a script; a phone
 * sending a long backlog after a day offline is only slowed down, since it
 * tries a 429 again later.
 */
export const staffRateLimits = {
  uploadUrls: createMemoryRateLimit({ limit: 120, windowMs: TEN_MINUTES }),
  confirm: createMemoryRateLimit({ limit: 120, windowMs: TEN_MINUTES }),
  telemetry: createMemoryRateLimit({ limit: 120, windowMs: TEN_MINUTES }),
};
