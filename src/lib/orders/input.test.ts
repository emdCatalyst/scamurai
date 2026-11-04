import { describe, expect, it } from 'vitest';
import { AMOUNT_MAX, formatAmount, isValidOrderNumber, normalizeNotes, normalizeOrderNumber, parseAmount } from './input';
import { orderErrorCode, RETRYABLE_ORDER_ERRORS } from './errors';

describe('normalizeOrderNumber', () => {
  it('turns Arabic-Indic digits into Latin digits', () => {
    expect(normalizeOrderNumber('١٢٣٤')).toBe('1234');
    expect(normalizeOrderNumber('۱۲۳۴')).toBe('1234');
    expect(normalizeOrderNumber('١٢34')).toBe('1234');
  });

  it('drops invisible characters, a leading "#", extra spaces, and upper-cases', () => {
    expect(normalizeOrderNumber('  #1234 ')).toBe('1234');
    expect(normalizeOrderNumber('12‏34')).toBe('1234');
    expect(normalizeOrderNumber('‮4321‬')).toBe('4321');
    expect(normalizeOrderNumber('hs  -  12')).toBe('HS - 12');
    expect(normalizeOrderNumber('１２３')).toBe('123'); // full-width digits
  });

  it('keeps a "#" inside the number', () => {
    expect(normalizeOrderNumber('A#12')).toBe('A#12');
  });
});

describe('isValidOrderNumber', () => {
  it('accepts ordinary order numbers', () => {
    for (const value of ['1234', 'HS-1234', 'ORD 55/7', 'A#12']) expect(isValidOrderNumber(value)).toBe(true);
  });

  it('rejects empty, too long, control characters and angle brackets', () => {
    expect(isValidOrderNumber('')).toBe(false);
    expect(isValidOrderNumber('1'.repeat(41))).toBe(false);
    expect(isValidOrderNumber('12\n34')).toBe(false);
    expect(isValidOrderNumber('<b>1</b>')).toBe(false);
  });
});

describe('parseAmount', () => {
  it('reads plain amounts', () => {
    expect(parseAmount('37')).toBe(37);
    expect(parseAmount('37.95')).toBe(37.95);
    expect(parseAmount('37.')).toBe(37);
    expect(parseAmount('.5')).toBe(0.5);
    expect(parseAmount(' 0 ')).toBe(0);
  });

  it('reads Arabic digits and separators', () => {
    expect(parseAmount('٣٧٫٩٥')).toBe(37.95);
    expect(parseAmount('٣٬٢٥٠')).toBe(3250);
    expect(parseAmount('۴۵')).toBe(45);
  });

  it('reads a comma with one or two digits after it as decimals, with three as thousands', () => {
    expect(parseAmount('37,95')).toBe(37.95);
    expect(parseAmount('12,5')).toBe(12.5);
    expect(parseAmount('1,250')).toBe(1250);
    expect(parseAmount('125,000')).toBe(125_000);
    expect(parseAmount('1,000,000')).toBe(1_000_000);
    expect(parseAmount('1,250.50')).toBe(1250.5);
  });

  it('refuses anything ambiguous or out of range', () => {
    for (const value of ['', 'abc', '-5', '1.250', '1,2345', '1,25.5', 'NaN', 'Infinity', '1e5', '37.955', '١٢.٣٤٥']) {
      expect(parseAmount(value), value).toBeNull();
    }
    expect(parseAmount(String(AMOUNT_MAX))).toBe(AMOUNT_MAX);
    expect(parseAmount(String(AMOUNT_MAX + 1))).toBeNull();
  });

  it('formats for the API', () => {
    expect(formatAmount(37.9)).toBe('37.90');
    expect(formatAmount(parseAmount('٣٧٫٩٥')!)).toBe('37.95');
  });
});

describe('normalizeNotes', () => {
  it('trims and drops bidi and control characters but keeps line breaks', () => {
    expect(normalizeNotes('  bag torn\r\nsee photo ‮ ')).toBe('bag torn\nsee photo');
    expect(normalizeNotes('   ')).toBe('');
  });
});

describe('orderErrorCode', () => {
  it('uses the code from the answer when it is known', () => {
    expect(orderErrorCode(409, { error: 'x', code: 'other_account' })).toBe('other_account');
  });

  it('falls back to the HTTP status', () => {
    expect(orderErrorCode(401, null)).toBe('unauthenticated');
    expect(orderErrorCode(503, { code: 'made_up' })).toBe('server_error');
    expect(orderErrorCode(408, null)).toBe('server_error');
    expect(orderErrorCode(400, {})).toBe('invalid_input');
  });

  it('retries only what can succeed without the worker changing anything', () => {
    expect(RETRYABLE_ORDER_ERRORS.has('server_error')).toBe(true);
    expect(RETRYABLE_ORDER_ERRORS.has('duplicate_order')).toBe(false);
    expect(RETRYABLE_ORDER_ERRORS.has('other_account')).toBe(false);
  });
});
