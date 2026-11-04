import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseRiyadhDate, riyadhDate, riyadhPresets, startOfRiyadhDay, startOfRiyadhMonth } from './riyadhDays';

// 01:30 on Friday 6 November in Riyadh, still the 5th in UTC.
const LATE_NIGHT = new Date('2026-11-05T22:30:00Z');

describe.each(['UTC', 'Asia/Riyadh', 'America/Los_Angeles', 'Pacific/Kiritimati'])('Riyadh days on a server in %s', (zone) => {
  const original = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = zone;
  });
  afterAll(() => {
    process.env.TZ = original;
  });

  it('puts an instant on its Riyadh day', () => {
    expect(riyadhDate(LATE_NIGHT)).toBe('2026-11-06');
    expect(riyadhDate(new Date('2026-11-05T20:59:59.999Z'))).toBe('2026-11-05');
    expect(riyadhDate(new Date('2026-11-05T21:00:00Z'))).toBe('2026-11-06');
  });

  it('starts days and months at midnight in Riyadh', () => {
    expect(startOfRiyadhDay(LATE_NIGHT).toISOString()).toBe('2026-11-05T21:00:00.000Z');
    expect(startOfRiyadhDay(new Date('2026-11-05T21:00:00Z')).toISOString()).toBe('2026-11-05T21:00:00.000Z');
    expect(startOfRiyadhMonth(LATE_NIGHT).toISOString()).toBe('2026-10-31T21:00:00.000Z');
    // 1 December 00:30 in Riyadh is still November in UTC.
    expect(startOfRiyadhMonth(new Date('2026-11-30T21:30:00Z')).toISOString()).toBe('2026-11-30T21:00:00.000Z');
  });

  it('reads the dates finance picks as Riyadh days', () => {
    expect(parseRiyadhDate('2026-11-06')?.toISOString()).toBe('2026-11-05T21:00:00.000Z');
    expect(parseRiyadhDate('2028-02-29')?.toISOString()).toBe('2028-02-28T21:00:00.000Z');
    for (const value of ['', '2026-11-6', '2026-02-31', '2026-02-29', '2026-13-01', '06/11/2026', '2026-11-06T00:00']) {
      expect(parseRiyadhDate(value), value).toBeUndefined();
    }
  });

  it('gives the presets for the Riyadh calendar', () => {
    expect(riyadhPresets(LATE_NIGHT)).toEqual({
      today: { from: '2026-11-06', to: '2026-11-06' },
      week: { from: '2026-11-01', to: '2026-11-07' },
      month: { from: '2026-11-01', to: '2026-11-30' },
    });
    // A Sunday, and the last day of a leap February.
    expect(riyadhPresets(new Date('2028-02-27T10:00:00Z'))).toMatchObject({
      week: { from: '2028-02-27', to: '2028-03-04' },
      month: { from: '2028-02-01', to: '2028-02-29' },
    });
  });
});
