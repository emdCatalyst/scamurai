/**
 * Calendar days as the brands count them: Saudi time, whatever zone the
 * server (UTC on Cloud Run) or the browser runs in. Finance date filters,
 * their presets, dashboards and branch counts all use these days. Saudi
 * Arabia keeps UTC+3 all year (no daylight saving), so a fixed offset is
 * exact. Pure functions: the browser uses them too.
 */

const OFFSET_MS = 3 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** The Riyadh day `instant` falls on, as yyyy-MM-dd. */
export function riyadhDate(instant: Date = new Date()): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** When the Riyadh day of `instant` began. */
export function startOfRiyadhDay(instant: Date = new Date()): Date {
  return new Date(Math.floor((instant.getTime() + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS);
}

/** When the Riyadh month of `instant` began. */
export function startOfRiyadhMonth(instant: Date = new Date()): Date {
  const local = new Date(instant.getTime() + OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - OFFSET_MS);
}

/** When the Riyadh day `date` (yyyy-MM-dd, as date inputs send it) began; undefined for anything else. */
export function parseRiyadhDate(date: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const midnightUtc = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(midnightUtc)) return undefined;
  const start = new Date(midnightUtc - OFFSET_MS);
  // "2026-02-31" parses as March 3rd: not a day anyone picked.
  return riyadhDate(start) === date ? start : undefined;
}

/** The finance date presets as yyyy-MM-dd ranges: today, this week (Sunday to Saturday) and this month. */
export function riyadhPresets(now: Date = new Date()) {
  const today = startOfRiyadhDay(now);
  const weekStart = new Date(today.getTime() - new Date(today.getTime() + OFFSET_MS).getUTCDay() * DAY_MS);
  const monthStart = startOfRiyadhMonth(now);
  const nextMonthStart = startOfRiyadhMonth(new Date(monthStart.getTime() + 32 * DAY_MS));
  const range = (from: Date, to: Date) => ({ from: riyadhDate(from), to: riyadhDate(to) });
  return {
    today: range(today, today),
    week: range(weekStart, new Date(weekStart.getTime() + 6 * DAY_MS)),
    month: range(monthStart, new Date(nextMonthStart.getTime() - DAY_MS)),
  };
}
