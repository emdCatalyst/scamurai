import { describe, expect, it } from 'vitest';
import { getApplyHref, getServicePath } from './links';

describe('getApplyHref', () => {
  it('preselects the service and, when given, the plan on the application form', () => {
    expect(getApplyHref('dispute_orders', 'growth')).toEqual({
      pathname: '/apply',
      query: { service: 'dispute_orders', plan: 'growth' },
    });
    expect(getApplyHref('compliance')).toEqual({ pathname: '/apply', query: { service: 'compliance' } });
  });
});

describe('getServicePath', () => {
  it('builds the locale-less service page path from the slug', () => {
    expect(getServicePath({ slug: 'order-protection' })).toBe('/services/order-protection');
  });
});
