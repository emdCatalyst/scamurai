/**
 * Reports staff phones send to /api/staff-telemetry, checked before they
 * become a `[telemetry]` log line:
 *   - vitals: page speed on the worker's own phone (next/web-vitals),
 *   - outbox: orders stuck on a phone (waiting long, or rejected), and how
 *     many orders other accounts left on it.
 */

export type Telemetry =
  | { type: 'vitals'; name: string; value: number; rating?: string }
  | { type: 'outbox'; waiting: number; failed: number; oldestWaitingSec: number; otherAccounts?: number };

const VITALS = new Set(['TTFB', 'FCP', 'LCP', 'INP', 'CLS']);
const RATINGS = new Set(['good', 'needs-improvement', 'poor']);

/** A whole number from 0 to `max`, or null. */
const count = (value: unknown, max: number) =>
  Number.isInteger(value) && (value as number) >= 0 ? Math.min(value as number, max) : null;

export function parseTelemetry(body: unknown): Telemetry | null {
  if (typeof body !== 'object' || body === null) return null;
  const data = body as Record<string, unknown>;

  if (data.type === 'vitals') {
    const { name, value, rating } = data;
    if (typeof name !== 'string' || !VITALS.has(name)) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 600_000) return null;
    return {
      type: 'vitals',
      name,
      // CLS is a small unitless score; the others are milliseconds.
      value: name === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value),
      ...(typeof rating === 'string' && RATINGS.has(rating) && { rating }),
    };
  }

  if (data.type === 'outbox') {
    const waiting = count(data.waiting, 10_000);
    const failed = count(data.failed, 10_000);
    const oldestWaitingSec = count(data.oldestWaitingSec, 365 * 24 * 3600);
    // Optional: phones still on the previous version don't send it.
    const otherAccounts = data.otherAccounts === undefined ? undefined : count(data.otherAccounts, 10_000);
    if (waiting === null || failed === null || oldestWaitingSec === null || otherAccounts === null) return null;
    return { type: 'outbox', waiting, failed, oldestWaitingSec, ...(otherAccounts !== undefined && { otherAccounts }) };
  }

  return null;
}

/** Fire-and-forget, from the browser; survives the page closing. */
export function sendTelemetry(report: Telemetry): void {
  const body = JSON.stringify(report);
  try {
    if (navigator.sendBeacon?.('/api/staff-telemetry', body)) return;
  } catch {
    // Some browsers throw instead of returning false.
  }
  void fetch('/api/staff-telemetry', { method: 'POST', body, keepalive: true }).catch(() => {});
}
