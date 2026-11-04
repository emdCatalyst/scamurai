import { describe, expect, it } from 'vitest';
import { brandTokensCss, contrastRatio, DEFAULT_BRAND_COLORS, deriveBrandTokens, hasLowContrastText, textColorOn } from './brandTokens';

const INJECTION = 'red}</style><meta http-equiv="refresh" content="0;url=https://evil.example/login">';
const NAVY = '#0A1628';
const WHITE = '#FFFFFF';

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

  it('writes navy or white on each colour, whichever contrasts more', () => {
    // Mid-tone colours that used to get white text at 2.8 to 3.7:1.
    for (const primary of ['#4CAF50', '#43A047', '#2196F3', '#FF5722', '#F44336']) {
      expect(deriveBrandTokens({ primary })['--brand-primary-fg']).toBe(NAVY);
    }
    for (const color of ['#000000', '#172b49', '#DC2626', '#3F51B5', '#777777', '#4fc5df', '#FFEB3B', '#ffffff']) {
      const tokens = deriveBrandTokens({ primary: color, background: color, surface: color, danger: color });
      for (const fg of ['--brand-primary-fg', '--brand-background-fg', '--brand-surface-fg', '--brand-danger-fg']) {
        const other = tokens[fg] === NAVY ? WHITE : NAVY;
        expect(contrastRatio(color, tokens[fg])).toBeGreaterThanOrEqual(contrastRatio(color, other));
      }
    }
    expect(deriveBrandTokens(DEFAULT_BRAND_COLORS)).toMatchObject({
      '--brand-primary-fg': NAVY,
      '--brand-background-fg': WHITE,
      '--brand-surface-fg': NAVY,
      '--brand-danger-fg': WHITE,
    });
  });

  it('has the tints as plain rgba() colours, for browsers without color-mix()', () => {
    const tokens = deriveBrandTokens({ primary: '#336699', surface: '#ffffff', danger: '#DC2626' });
    expect(tokens).toMatchObject({
      '--brand-primary-soft': 'rgba(51, 102, 153, 0.2)',
      '--brand-danger-soft': 'rgba(220, 38, 38, 0.1)',
      '--brand-danger-line': 'rgba(220, 38, 38, 0.25)',
      // Navy, the text colour on a white surface.
      '--brand-surface-fg-soft': 'rgba(10, 22, 40, 0.1)',
    });
  });

  it('measures contrast as WCAG 2.1 does', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21);
    expect(contrastRatio('#4CAF50', WHITE)).toBeCloseTo(2.78, 2);
    expect(contrastRatio('#4CAF50', NAVY)).toBeCloseTo(6.52, 2);
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

describe('textColorOn and hasLowContrastText', () => {
  it('picks navy on light colours and white on dark ones', () => {
    expect(textColorOn('#FFFFFF')).toBe(NAVY);
    expect(textColorOn('#172b49')).toBe(WHITE);
  });

  it('flags only colours where neither navy nor white reaches 4.5:1', () => {
    expect(hasLowContrastText('#7B7B7B')).toBe(true); // mid grey: about 4.3:1 at best
    expect(hasLowContrastText('#4CAF50')).toBe(false); // navy text on it
    expect(hasLowContrastText('#172b49')).toBe(false);
    expect(hasLowContrastText('#FFFFFF')).toBe(false);
  });
});
