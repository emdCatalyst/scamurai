import { describe, expect, it } from 'vitest';
import { NOTES_MAX_LENGTH, ORDER_NUMBER_MAX_LENGTH } from '@/lib/orders/input';
import {
  confirmRequestSchema,
  invalidField,
  isOrderId,
  savedByOtherAccount,
  uploadUrlsRequestSchema,
  waitedSeconds,
} from './orders';

const APP_ID = '00000000-0000-4000-8000-000400000001';
const base = { orderNumber: '1234', deliveryAppId: APP_ID, subtotal: '37.95' };

const fieldOf = (input: unknown) => {
  const result = uploadUrlsRequestSchema.safeParse(input);
  return result.success ? 'valid' : invalidField(result.error);
};

describe('uploadUrlsRequestSchema', () => {
  it('reads what the phone sends the way the phone does', () => {
    expect(
      uploadUrlsRequestSchema.parse({
        ...base,
        clientOrderId: '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d',
        orderNumber: ' #١٢٣٤ ',
        subtotal: '٣٧٫٩٥',
        currency: 'SAR',
        notes: '  bag torn ‮ ',
        savedByUserId: 'user_1',
        savedAt: 1,
      })
    ).toEqual({
      clientOrderId: '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d',
      orderNumber: '1234',
      deliveryAppId: APP_ID,
      subtotal: 37.95,
      currency: 'SAR',
      notes: 'bag torn',
    });
  });

  it('takes the amount as a number too, and leaves out what is optional', () => {
    expect(uploadUrlsRequestSchema.parse({ ...base, subtotal: 42.5, notes: null })).toEqual({
      orderNumber: '1234',
      deliveryAppId: APP_ID,
      subtotal: 42.5,
      notes: null,
    });
    expect(uploadUrlsRequestSchema.parse({ ...base, subtotal: 0 }).subtotal).toBe(0);
  });

  it('refuses amounts that would poison the totals, naming the field', () => {
    for (const subtotal of [-999999, 'NaN', 'Infinity', 1e13, 'abc', '', '1e5', null, undefined]) {
      expect(fieldOf({ ...base, subtotal }), String(subtotal)).toBe('subtotal');
    }
  });

  it('refuses order numbers that are empty, too long or hold control characters', () => {
    for (const orderNumber of ['', ' # ', 'Z'.repeat(ORDER_NUMBER_MAX_LENGTH + 1), '12\u000134', '<b>', 1234]) {
      expect(fieldOf({ ...base, orderNumber }), String(orderNumber)).toBe('orderNumber');
    }
    expect(fieldOf({ ...base, orderNumber: 'Z'.repeat(ORDER_NUMBER_MAX_LENGTH) })).toBe('valid');
  });

  it('refuses notes over the limit once normalized, any currency but SAR, and malformed ids', () => {
    expect(fieldOf({ ...base, notes: 'A'.repeat(NOTES_MAX_LENGTH + 1) })).toBe('notes');
    expect(fieldOf({ ...base, notes: ` ${'A'.repeat(NOTES_MAX_LENGTH)} ` })).toBe('valid');
    expect(fieldOf({ ...base, currency: 'USD' })).toBe('currency');
    expect(fieldOf({ ...base, deliveryAppId: 'x' })).toBe('deliveryAppId');
    expect(fieldOf({ ...base, clientOrderId: 'not-a-uuid' })).toBe('clientOrderId');
    expect(fieldOf(undefined)).toBeUndefined();
  });
});

describe('confirmRequestSchema', () => {
  it('accepts the upload report, an empty one, and nulls', () => {
    expect(confirmRequestSchema.parse({ savedAt: 1_700_000_000_000, attempts: 2 })).toEqual({ savedAt: 1_700_000_000_000, attempts: 2 });
    expect(confirmRequestSchema.parse({})).toEqual({});
    expect(confirmRequestSchema.safeParse({ savedAt: null, attempts: null }).success).toBe(true);
  });

  it('refuses anything else', () => {
    expect(confirmRequestSchema.safeParse({ attempts: -1 }).success).toBe(false);
    expect(confirmRequestSchema.safeParse({ savedAt: 'yesterday' }).success).toBe(false);
  });
});

describe('isOrderId', () => {
  it('accepts the UUIDs orders are keyed by, and nothing else', () => {
    expect(isOrderId('1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d')).toBe(true);
    expect(isOrderId(APP_ID)).toBe(true);
    for (const value of ['', 'x', '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d\n[orders] confirmed', '../etc/passwd']) {
      expect(isOrderId(value), value).toBe(false);
    }
  });
});

describe('savedByOtherAccount', () => {
  it('is true only when the body names another user', () => {
    expect(savedByOtherAccount({ savedByUserId: 'user_2' }, 'user_1')).toBe(true);
    expect(savedByOtherAccount({ savedByUserId: 'user_1' }, 'user_1')).toBe(false);
    expect(savedByOtherAccount({}, 'user_1')).toBe(false);
    expect(savedByOtherAccount(null, 'user_1')).toBe(false);
    expect(savedByOtherAccount('text', 'user_1')).toBe(false);
  });
});

describe('waitedSeconds', () => {
  it('counts from the phone time, never below 0, and ignores junk', () => {
    expect(waitedSeconds(1_000, 91_000)).toBe(90);
    expect(waitedSeconds(100_000, 1_000)).toBe(0);
    for (const junk of [0, -5, Number.NaN, '1000', null, undefined]) expect(waitedSeconds(junk, 1_000)).toBeUndefined();
  });
});
