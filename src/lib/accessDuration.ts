/**
 * Shared menu of access-duration options for the master admin.
 *
 * Used at approval time (granting initial access) and from the admin brands
 * list (extending an existing brand's term). Keeping the menu in one place
 * means the server action and the UI can't drift.
 */

export type AccessDuration = "1mo" | "3mo" | "6mo" | "1yr" | "none";

export const ACCESS_DURATIONS: AccessDuration[] = [
  "1mo",
  "3mo",
  "6mo",
  "1yr",
  "none",
];

/**
 * Returns the expiry timestamp (or null for lifetime) given a duration and
 * a starting point. When extending an active brand, pass its current
 * accessExpiresAt as `from` so the new term stacks on top of remaining days
 * instead of resetting the clock.
 */
export function durationToExpiry(
  duration: AccessDuration,
  from: Date = new Date()
): Date | null {
  if (duration === "none") return null;

  const d = new Date(from);
  switch (duration) {
    case "1mo":
      d.setMonth(d.getMonth() + 1);
      break;
    case "3mo":
      d.setMonth(d.getMonth() + 3);
      break;
    case "6mo":
      d.setMonth(d.getMonth() + 6);
      break;
    case "1yr":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export function isValidDuration(value: string): value is AccessDuration {
  return (ACCESS_DURATIONS as string[]).includes(value);
}
