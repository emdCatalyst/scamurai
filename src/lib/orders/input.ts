import { toLatinDigits } from '@/lib/digits';

/**
 * What a worker types on the order screen, read the same way on the phone and
 * on the server, so a number that looks the same is the same order.
 */

export const ORDER_NUMBER_MAX_LENGTH = 40;
export const NOTES_MAX_LENGTH = 500;
/** Highest amount accepted for one order, in SAR. */
export const AMOUNT_MAX = 1_000_000;

/** Bidi controls, zero-width characters and the BOM: invisible, but they make equal-looking text differ. */
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
/** Control and format characters, and angle brackets, have no place in an order number. */
const NOT_ALLOWED_IN_ORDER_NUMBER = /[\p{C}<>]/u;

const clean = (raw: string) => toLatinDigits(raw.normalize('NFKC')).replace(INVISIBLE, '');

/**
 * The stored form of an order number: Latin digits (Arabic keyboards type
 * ٠-٩), no invisible characters, no leading "#", single spaces, upper case.
 * "#١٢٣٤ " and "1234" are the same order.
 */
export function normalizeOrderNumber(raw: string): string {
  return clean(raw)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^#+\s*/, '')
    .toUpperCase();
}

/** Whether a normalized order number can be stored. */
export function isValidOrderNumber(orderNumber: string): boolean {
  return (
    orderNumber.length > 0 &&
    orderNumber.length <= ORDER_NUMBER_MAX_LENGTH &&
    !NOT_ALLOWED_IN_ORDER_NUMBER.test(orderNumber)
  );
}

/**
 * Reads an amount as typed on a phone: Arabic-Indic digits, "٫" or a comma
 * with one or two digits after it as the decimal separator ("37,95" is 37.95),
 * and commas, "٬" or spaces between thousands ("1,250" is 1250). Returns null
 * for anything else, for more than 2 decimals, and above AMOUNT_MAX: better to
 * ask again than to store a wrong amount as evidence.
 */
export function parseAmount(raw: string): number | null {
  let text = clean(raw).replace(/[\s٬']/g, '').replace(/٫/g, '.').replace(/،/g, ',');
  if (text.includes('.')) text = text.replace(/,(?=\d{3}(?!\d))/g, '');
  else if (/^\d+,\d{1,2}$/.test(text)) text = text.replace(',', '.');
  else text = text.replace(/,(?=\d{3}(?!\d))/g, '');

  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount <= AMOUNT_MAX ? amount : null;
}

/** The amount as the API sends and the database stores it ("37.95"). */
export const formatAmount = (amount: number): string => amount.toFixed(2);

/** Bidi embeddings, overrides and isolates: they can make text read differently from what was typed. */
const BIDI_CONTROLS = /[‪-‮⁦-⁩]/g;

/**
 * Trimmed notes; empty means none. Drops bidi controls and control characters
 * other than line breaks and tabs.
 */
export function normalizeNotes(raw: string): string {
  return raw
    .replace(BIDI_CONTROLS, '')
    .replace(/\p{Cc}/gu, (char) => (char === '\n' || char === '\t' ? char : ''))
    .trim();
}
