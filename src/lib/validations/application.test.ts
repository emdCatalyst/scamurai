import { describe, expect, it } from 'vitest';
import en from '../../../messages/en/apply.json';
import ar from '../../../messages/ar/apply.json';
import { applicationSchema } from './application';

const base = {
  brandName: 'Burger House',
  contactName: 'Sara',
  contactEmail: '  Sara@Example.COM ',
  phone: '',
  branchCount: '4',
};

function errorsOf(input: unknown) {
  const result = applicationSchema.safeParse(input);
  return result.success ? {} : result.error.flatten().fieldErrors;
}

describe('applicationSchema', () => {
  it('accepts a live-service application with a plan and normalises fields', () => {
    const result = applicationSchema.parse({ ...base, service: 'dispute_orders', plan: 'growth' });
    expect(result).toMatchObject({
      service: 'dispute_orders',
      plan: 'growth',
      contactEmail: 'sara@example.com',
      branchCount: 4,
      phone: undefined,
    });
  });

  it('requires a plan for live services', () => {
    expect(errorsOf({ ...base, service: 'dispute_orders' }).plan).toEqual(['errPlan']);
  });

  it('drops any plan for coming-soon services (interest registration)', () => {
    const result = applicationSchema.parse({ ...base, service: 'compliance', plan: 'starter' });
    expect(result.plan).toBeUndefined();
    expect(applicationSchema.parse({ ...base, service: 'receiving' }).plan).toBeUndefined();
  });

  it('rejects unknown services and out-of-range branch counts', () => {
    expect(errorsOf({ ...base, service: 'payroll' }).service).toEqual(['errService']);
    expect(errorsOf({ ...base, service: 'compliance', branchCount: 0 }).branchCount).toEqual(['errBranchCount']);
    expect(errorsOf({ ...base, service: 'compliance', branchCount: 'abc' }).branchCount).toBeTruthy();
    expect(errorsOf({ ...base, service: 'compliance', branchCount: 10001 }).branchCount).toEqual(['errBranchCount']);
  });

  it('validates phone format only when a phone is given', () => {
    expect(errorsOf({ ...base, service: 'compliance', phone: '+966 50 123 4567' }).phone).toBeUndefined();
    expect(errorsOf({ ...base, service: 'compliance', phone: 'call me' }).phone).toEqual(['errPhone']);
  });

  it('uses only error keys that exist in both locales', () => {
    const inputs: unknown[] = [
      {},
      { service: 'x', plan: 'x', brandName: '!', contactName: 'a', contactEmail: 'no', phone: 'x', branchCount: -1 },
      { ...base, service: 'dispute_orders', brandName: 'a'.repeat(61), contactName: 'b'.repeat(81) },
    ];
    const keys = new Set(inputs.flatMap((input) => Object.values(errorsOf(input)).flat()));
    expect(keys.size).toBeGreaterThan(0);
    for (const key of keys) {
      expect(en).toHaveProperty([key as string]);
      expect(ar).toHaveProperty([key as string]);
    }
  });
});
