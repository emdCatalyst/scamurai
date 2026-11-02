/**
 * Generates the social-share images for the public marketing site:
 *
 *   src/app/[locale]/(marketing)/opengraph-image.png  1200×630  Open Graph (WhatsApp, LinkedIn, Slack, …)
 *   src/app/[locale]/(marketing)/twitter-image.png    1200×600  X / Twitter summary_large_image (2:1)
 *
 * plus a matching `.alt.txt` for each. Next.js turns these files into
 * og:image / twitter:image tags (with width, height and alt) for every
 * marketing page in both locales, so pages need no image metadata of their own.
 *
 *   node scripts/generate-og-image.mjs
 *
 * Re-run after changing COPY, the brand mark or the fonts, and commit the
 * outputs. Text is shaped by Pango + HarfBuzz (bundled with sharp) using the
 * brand font from public/fonts, so Arabic letters join and run right-to-left
 * correctly. Satori (next/og) cannot shape Arabic, which is why these images
 * are static files rather than generated per request.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'src', 'app', '[locale]', '(marketing)');
const MARK_FILE = path.join(ROOT, 'public', 'logos', 'secondy logo 2.svg');
const FONT_DIR = path.join(ROOT, 'public', 'fonts');

/** Baked into the pixels. Keep in step with `siteName` / `home.title` in messages/<locale>/seo.json. */
const COPY = {
  name: { en: 'Scamurai', ar: 'سكامورائي' },
  tagline: {
    en: 'Proof-based operations for multi-branch businesses',
    ar: 'منصة تشغيل موثّقة للمنشآت متعددة الفروع',
  },
};

/** Describes everything the image shows; one string serves both locales. */
const ALT_TEXT = `${COPY.name.en} · ${COPY.name.ar} — ${COPY.tagline.en} · ${COPY.tagline.ar}`;

/** ITF Qomra Arabic ships Latin and Arabic glyphs, so one family sets both scripts. */
const FONTS = {
  bold: { file: 'ITFQOMRAARABIC-BOLD.OTF', family: 'itf Qomra Arabic Bold' },
  medium: { file: 'ITFQOMRAARABIC-MEDIUM.OTF', family: 'itf Qomra Arabic Med' },
};

/** Brand palette (tailwind.config.ts). */
const COLOR = {
  navyDeep: '#0d1e35',
  navy: '#172b49',
  teal: '#0e2a3a',
  sky: '#4fc5df',
  mint: '#5cbf8f',
  text: '#ffffff',
  textMuted: '#d6e6ef',
};

const CARDS = [
  { name: 'opengraph-image', width: 1200, height: 630 },
  { name: 'twitter-image', width: 1200, height: 600 },
];

const LAYOUT = {
  markSize: 150,
  wordmarkSize: 72,
  taglineSize: 36,
  /** Copy longer than this wraps onto another centred line instead of leaving the card. */
  textWidth: 1040,
  accentBar: { width: 112, height: 6 },
  bottomStrip: 8,
  gaps: { afterMark: 40, afterWordmark: 34, afterBar: 34, betweenTaglines: 20 },
};

/** Pango sizes and offsets are in 1/1024 pt; at 72 dpi one point is one pixel. */
const pangoUnits = (px) => Math.round(px * 1024);

const escapeMarkup = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = (text, color) => `<span foreground="${color}">${escapeMarkup(text)}</span>`;

/**
 * Both names in a single Pango run so Latin and Arabic share one baseline. The
 * separator is the font's own (diamond) full stop, enlarged and raised to the
 * x-height, which echoes the letter dots of the Arabic.
 */
function wordmarkMarkup() {
  const size = LAYOUT.wordmarkSize;
  const separator = `<span foreground="${COLOR.sky}" size="${pangoUnits(size * 1.8)}" rise="${pangoUnits(size * 0.16)}">.</span>`;
  return `<span foreground="${COLOR.text}">${escapeMarkup(COPY.name.en)}  ${separator}  ${escapeMarkup(COPY.name.ar)}</span>`;
}

/** Renders Pango markup to a transparent PNG cropped to the ink. */
async function renderText(markup, font, size) {
  const { data, info } = await sharp({
    text: {
      text: markup,
      font: `${font.family} ${size}`,
      fontfile: path.join(FONT_DIR, font.file),
      width: LAYOUT.textWidth,
      align: 'centre',
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

async function renderMark() {
  const { data, info } = await sharp(await fs.readFile(MARK_FILE))
    .resize({ width: LAYOUT.markSize, height: LAYOUT.markSize, fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

const ctaGradient = (id) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${COLOR.sky}"/>
      <stop offset="1" stop-color="${COLOR.mint}"/>
    </linearGradient>`;

function accentBar() {
  const { width, height } = LAYOUT.accentBar;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>${ctaGradient('cta')}</defs>
  <rect width="${width}" height="${height}" rx="${height / 2}" fill="url(#cta)"/>
</svg>`;
  return { input: Buffer.from(svg), width, height };
}

/** Navy hero gradient, faint dot grid, sky and mint glows, brand-gradient strip along the bottom. */
function background(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="surface" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLOR.navyDeep}"/>
      <stop offset="0.45" stop-color="${COLOR.navy}"/>
      <stop offset="1" stop-color="${COLOR.teal}"/>
    </linearGradient>
    <radialGradient id="sky-glow" cx="${width / 2}" cy="40" r="${width * 0.47}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${COLOR.sky}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${COLOR.sky}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mint-glow" cx="${width - 50}" cy="${height + 30}" r="${width * 0.38}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${COLOR.mint}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${COLOR.mint}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="1.3" fill="#ffffff" fill-opacity="0.06"/>
    </pattern>${ctaGradient('cta')}
  </defs>
  <rect width="${width}" height="${height}" fill="url(#surface)"/>
  <rect width="${width}" height="${height}" fill="url(#dots)"/>
  <rect width="${width}" height="${height}" fill="url(#sky-glow)"/>
  <rect width="${width}" height="${height}" fill="url(#mint-glow)"/>
  <rect y="${height - LAYOUT.bottomStrip}" width="${width}" height="${LAYOUT.bottomStrip}" fill="url(#cta)"/>
</svg>`;
  return Buffer.from(svg);
}

/** Stacks the layers centred on the card, then flattens everything to a PNG. */
async function renderCard({ name, width, height }, stack) {
  const contentHeight = stack.reduce((sum, { layer, gapAfter }) => sum + layer.height + gapAfter, 0);
  const available = height - LAYOUT.bottomStrip;
  if (contentHeight > available) {
    throw new Error(`${name}: content is ${contentHeight}px tall but only ${available}px fit; shorten COPY.`);
  }

  const composites = [];
  let top = Math.round((available - contentHeight) / 2);
  for (const { layer, gapAfter } of stack) {
    composites.push({ input: layer.input, left: Math.round((width - layer.width) / 2), top });
    top += layer.height + gapAfter;
  }

  return sharp(background(width, height))
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

const { gaps } = LAYOUT;
const stack = [
  { layer: await renderMark(), gapAfter: gaps.afterMark },
  { layer: await renderText(wordmarkMarkup(), FONTS.bold, LAYOUT.wordmarkSize), gapAfter: gaps.afterWordmark },
  { layer: accentBar(), gapAfter: gaps.afterBar },
  { layer: await renderText(span(COPY.tagline.en, COLOR.textMuted), FONTS.medium, LAYOUT.taglineSize), gapAfter: gaps.betweenTaglines },
  { layer: await renderText(span(COPY.tagline.ar, COLOR.textMuted), FONTS.medium, LAYOUT.taglineSize), gapAfter: 0 },
];

for (const card of CARDS) {
  const png = await renderCard(card, stack);
  await fs.writeFile(path.join(OUTPUT_DIR, `${card.name}.png`), png);
  // No trailing newline: Next.js uses the file contents verbatim as the alt attribute.
  await fs.writeFile(path.join(OUTPUT_DIR, `${card.name}.alt.txt`), ALT_TEXT);
  console.log(`wrote ${card.name}.png (${card.width}x${card.height}, ${Math.round(png.length / 1024)} KB) + .alt.txt`);
}
