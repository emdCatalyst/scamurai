import { describe, expect, it } from 'vitest';
import { parseTelemetry } from './telemetry';

describe('parseTelemetry', () => {
  it('keeps web vitals, rounded', () => {
    expect(parseTelemetry({ type: 'vitals', name: 'LCP', value: 2531.7, rating: 'needs-improvement' })).toEqual({
      type: 'vitals',
      name: 'LCP',
      value: 2532,
      rating: 'needs-improvement',
    });
    expect(parseTelemetry({ type: 'vitals', name: 'CLS', value: 0.123456 })).toEqual({ type: 'vitals', name: 'CLS', value: 0.123 });
  });

  it('keeps outbox reports', () => {
    expect(parseTelemetry({ type: 'outbox', waiting: 3, failed: 1, oldestWaitingSec: 1800, extra: 'dropped' })).toEqual({
      type: 'outbox',
      waiting: 3,
      failed: 1,
      oldestWaitingSec: 1800,
    });
  });

  it('drops anything else', () => {
    for (const body of [
      null,
      'text',
      { type: 'vitals', name: 'Next.js-hydration', value: 10 },
      { type: 'vitals', name: 'LCP', value: -1 },
      { type: 'vitals', name: 'LCP', value: 'fast' },
      { type: 'vitals', name: 'LCP', value: 100, rating: '<script>' },
      { type: 'outbox', waiting: 1.5, failed: 0, oldestWaitingSec: 1 },
      { type: 'outbox', waiting: 1 },
      { type: 'other' },
    ]) {
      const parsed = parseTelemetry(body);
      if (parsed && parsed.type === 'vitals') expect(parsed).not.toHaveProperty('rating', '<script>');
      else expect(parsed).toBeNull();
    }
  });
});
