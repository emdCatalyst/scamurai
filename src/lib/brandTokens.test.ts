import { describe, expect, it } from 'vitest';
import { brandTokensCss, DEFAULT_BRAND_COLORS, deriveBrandTokens } from './brandTokens';

const INJECTION = 'red}</style><meta http-equiv="refresh" content="0;url=https://evil.example/login">';

describe('deriveBrandTokens', () => {
  it('takes only #rrggbb colours from the brand and falls back to the defaults', () => {
    const tokens = deriveBrandTokens({
      primary: '#4CAF50',
      background: 'rgb(0, 0, 0)',
      surface: '#fff',
      textAccent: 42 as unknown as string,
      danger: INJECTION,
    });
    expect(tokens['--brand-primary']).toBe('#4CAF50');
    expect(tokens['--brand-background']).toBe(DEFAULT_BRAND_COLORS.background);
    expect(tokens['--brand-surface']).toBe(DEFAULT_BRAND_COLORS.surface);
    expect(tokens['--brand-text-accent']).toBe(DEFAULT_BRAND_COLORS.textAccent);
    expect(tokens['--brand-danger']).toBe(DEFAULT_BRAND_COLORS.danger);
    for (const value of Object.values(tokens)) {
      expect(value).toMatch(/^(#[0-9a-f]{6}|rgba\(\d+, ?\d+, ?\d+, ?[\d.]+\))$/i);
    }
  });

  it('uses the defaults for a brand without colours', () => {
    expect(deriveBrandTokens(null)).toEqual(deriveBrandTokens(DEFAULT_BRAND_COLORS));
    expect(deriveBrandTokens(undefined)['--brand-primary']).toBe(DEFAULT_BRAND_COLORS.primary);
  });
});

describe('brandTokensCss', () => {
  it('writes the tokens as one :root rule', () => {
    expect(brandTokensCss({ '--brand-primary': '#4fc5df', '--brand-border': 'rgba(0,0,0,0.12)' })).toBe(
      ':root { --brand-primary: #4fc5df; --brand-border: rgba(0,0,0,0.12); }'
    );
  });

  it('can never close its <style> element', () => {
    expect(brandTokensCss({ '--brand-danger': INJECTION })).not.toContain('<');
  });
});
