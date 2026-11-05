import { describe, expect, it } from 'vitest';
import { defaultLocaleRedirect, localizedPath, PREFIXED_LOCALES, splitLocale } from './paths';

describe('localizedPath', () => {
  it('puts English at the root and Arabic under /ar', () => {
    expect(localizedPath('en', '/')).toBe('/');
    expect(localizedPath('en', '')).toBe('/');
    expect(localizedPath('en', '/apply')).toBe('/apply');
    expect(localizedPath('en', 'services/order-protection')).toBe('/services/order-protection');
    expect(localizedPath('ar', '/')).toBe('/ar');
    expect(localizedPath('ar', '/apply')).toBe('/ar/apply');
    expect(localizedPath('ar', '/brands/demo/submit')).toBe('/ar/brands/demo/submit');
  });

  it('keeps a query string or hash', () => {
    expect(localizedPath('en', '/apply?service=x')).toBe('/apply?service=x');
    expect(localizedPath('ar', '/#services')).toBe('/ar/#services');
  });
});

describe('splitLocale', () => {
  it('reads the locale from the prefix, English when there is none', () => {
    expect(splitLocale('/')).toEqual({ locale: 'en', path: '/', prefixed: false });
    expect(splitLocale('/apply')).toEqual({ locale: 'en', path: '/apply', prefixed: false });
    expect(splitLocale('/ar')).toEqual({ locale: 'ar', path: '/', prefixed: true });
    expect(splitLocale('/ar/brands/x/login')).toEqual({ locale: 'ar', path: '/brands/x/login', prefixed: true });
    expect(splitLocale('/en/apply')).toEqual({ locale: 'en', path: '/apply', prefixed: true });
  });

  it('does not take a segment that only starts like a locale', () => {
    expect(splitLocale('/arabic')).toEqual({ locale: 'en', path: '/arabic', prefixed: false });
    expect(splitLocale('/english/x')).toEqual({ locale: 'en', path: '/english/x', prefixed: false });
  });
});

describe('defaultLocaleRedirect', () => {
  const at = (path: string) => defaultLocaleRedirect(new URL(path, 'https://misdaq.sa.com'))?.toString() ?? null;

  it('sends /en and /en/… to the same path without /en, query string kept', () => {
    expect(at('/en')).toBe('https://misdaq.sa.com/');
    expect(at('/en/')).toBe('https://misdaq.sa.com/');
    expect(at('/en/apply')).toBe('https://misdaq.sa.com/apply');
    expect(at('/en/apply?service=order-protection&plan=pro')).toBe(
      'https://misdaq.sa.com/apply?service=order-protection&plan=pro'
    );
    expect(at('/en/services/order-protection')).toBe('https://misdaq.sa.com/services/order-protection');
  });

  it('leaves every other path alone', () => {
    for (const path of ['/', '/apply', '/ar', '/ar/apply', '/english', '/enroll', '/api/health']) {
      expect(at(path)).toBeNull();
    }
  });
});

it('only Arabic is served under a prefix', () => {
  expect(PREFIXED_LOCALES).toEqual(['ar']);
});
