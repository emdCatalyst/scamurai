/**
 * Joins element ids for `aria-describedby` / `aria-labelledby`, skipping the
 * empty ones. Returns `undefined` when nothing is left, so React omits the
 * attribute instead of rendering an empty reference.
 */
export function idList(...ids: (string | false | null | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}
