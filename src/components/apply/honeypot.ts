/**
 * Anti-spam honeypot shared by the apply form (renders the field) and the
 * submitApplication action (checks it). Humans never see or reach the field;
 * naive bots fill every input they find.
 *
 * The name deliberately avoids words browsers autofill ("company", "name",
 * "email", "organization"...): an autofilled honeypot would silently discard
 * a real customer's application.
 */
export const HONEYPOT_FIELD = 'website';

/** True when the hidden field came back with any non-blank value. */
export function isHoneypotFilled(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) return false;
  const value = (input as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof value === 'string' && value.trim() !== '';
}
