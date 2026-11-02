const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g;
const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/**
 * Converts Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits to 0-9.
 * Arabic keyboards often type them in number and phone fields; the shared
 * schema only accepts Latin digits, so the form normalises them on input.
 */
export function toLatinDigits(value: string): string {
  return value.replace(ARABIC_INDIC_DIGITS, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code - (code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO));
  });
}
