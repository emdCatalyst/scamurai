import type { BrandColors } from '@/types/brand';

export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: '#4fc5df',   // Scamurai sky
  background: '#172b49',   // Scamurai navy
  surface: '#ffffff',
  textAccent: '#4fc5df',
  danger: '#DC2626',
};

// --- Utilities ---

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newL = Math.min(1, l + amount);
  const { r: nr, g: ng, b: nb } = hslToRgb(h, s, newL);
  return rgbToHex(nr, ng, nb);
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newL = Math.max(0, l - amount);
  const { r: nr, g: ng, b: nb } = hslToRgb(h, s, newL);
  return rgbToHex(nr, ng, nb);
}

function withOpacity(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Relative luminance per WCAG 2.1
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Returns contrast-safe foreground: Scamurai navy for light bg, white for dark bg
function getForeground(bgHex: string): string {
  return getLuminance(bgHex) > 0.35 ? '#0A1628' : '#FFFFFF';
}

// Returns a tinted/shaded version of a hex for active states
function getActiveTint(bgHex: string): string {
  // lighten dark backgrounds, darken light backgrounds — 10% shift
  return getLuminance(bgHex) > 0.35 ? darken(bgHex, 0.08) : lighten(bgHex, 0.12);
}

// Returns a border color derived from background
function getBorderColor(bgHex: string): string {
  return getLuminance(bgHex) > 0.35
    ? 'rgba(0,0,0,0.12)'
    : 'rgba(255,255,255,0.12)';
}

export function deriveBrandTokens(colors: BrandColors): Record<string, string> {
  const bgFg      = getForeground(colors.background);
  const surfaceFg = getForeground(colors.surface);
  const primaryFg = getForeground(colors.primary);
  const dangerFg  = getForeground(colors.danger ?? '#DC2626');

  return {
    '--brand-primary':              colors.primary,
    '--brand-primary-fg':           primaryFg,
    '--brand-background':           colors.background,
    '--brand-background-fg':        bgFg,
    '--brand-background-fg-muted':  withOpacity(bgFg, 0.6),
    '--brand-background-active':    getActiveTint(colors.background),
    '--brand-surface':              colors.surface,
    '--brand-surface-fg':           surfaceFg,
    '--brand-surface-fg-muted':     withOpacity(surfaceFg, 0.6),
    '--brand-text-accent':          colors.textAccent,
    '--brand-danger':               colors.danger ?? '#DC2626',
    '--brand-danger-fg':            dangerFg,
    '--brand-border':               getBorderColor(colors.background),
  };
}
