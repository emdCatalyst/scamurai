/**
 * Generates the social-share images for the public site, one per language:
 *
 *   public/og/misdaq-en.png  1200×630  the English wordmark, MISDAQ
 *   public/og/misdaq-ar.png  1200×630  the Arabic wordmark, مصداق
 *
 * src/lib/seo/site.ts (SHARE_IMAGES) puts them in og:image and twitter:image
 * on every page of that language, with their size and alt text. 1200×630 is
 * the Open Graph size and works for X's summary_large_image card too.
 *
 *   node scripts/generate-og-image.mjs
 *
 * The card is the Misdaq identity at its plainest: the page language's
 * wordmark in white on Misdaq Black, inside the corners of the proof frame,
 * with one orange mark for the order evidence product. Everything is drawn
 * from the SVGs in public/brand, so no font is needed. Re-run after changing
 * a logo file, and commit the outputs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_DIR = path.join(ROOT, 'public', 'brand');
const OUTPUT_DIR = path.join(ROOT, 'public', 'og');

const COLOR = { black: '#0B0B0B', white: '#FFFFFF', orange: '#FF5B3A' };
const WIDTH = 1200;
const HEIGHT = 630;

/** Logo widths chosen so both wordmarks carry the same visual weight. */
const CARDS = [
  { file: 'misdaq-en.png', logo: 'logo-english.svg', logoWidth: 560 },
  { file: 'misdaq-ar.png', logo: 'logo-arabic.svg', logoWidth: 500 },
];

const LAYOUT = {
  /** Proof-frame corners: inset from the card edge, arm length and stroke. */
  frame: { inset: 56, arm: 64, stroke: 4 },
  marker: { width: 72, height: 8, gap: 56 },
};

async function renderLogo(file, width) {
  const svg = (await fs.readFile(path.join(BRAND_DIR, file), 'utf8')).replace(/fill="currentColor"/g, `fill="${COLOR.white}"`);
  const { data, info } = await sharp(Buffer.from(svg), { density: 300 })
    .resize({ width })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

/** Black card with the four corners of the proof frame and the orange marker under the logo. */
function background(markerTop) {
  const { inset, arm, stroke } = LAYOUT.frame;
  const right = WIDTH - inset;
  const bottom = HEIGHT - inset;
  const corner = (d) => `<path d="${d}" fill="none" stroke="${COLOR.white}" stroke-width="${stroke}" stroke-opacity="0.85"/>`;
  const marker = LAYOUT.marker;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLOR.black}"/>
  ${corner(`M ${inset} ${inset + arm} V ${inset} H ${inset + arm}`)}
  ${corner(`M ${right - arm} ${inset} H ${right} V ${inset + arm}`)}
  ${corner(`M ${inset} ${bottom - arm} V ${bottom} H ${inset + arm}`)}
  ${corner(`M ${right - arm} ${bottom} H ${right} V ${bottom - arm}`)}
  <rect x="${(WIDTH - marker.width) / 2}" y="${markerTop}" width="${marker.width}" height="${marker.height}" rx="${marker.height / 2}" fill="${COLOR.orange}"/>
</svg>`);
}

async function renderCard(logo) {
  const { marker } = LAYOUT;
  const contentHeight = logo.height + marker.gap + marker.height;
  const top = Math.round((HEIGHT - contentHeight) / 2);
  return sharp(background(top + logo.height + marker.gap))
    .composite([{ input: logo.input, left: Math.round((WIDTH - logo.width) / 2), top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
for (const card of CARDS) {
  const png = await renderCard(await renderLogo(card.logo, card.logoWidth));
  await fs.writeFile(path.join(OUTPUT_DIR, card.file), png);
  console.log(`wrote public/og/${card.file} (${WIDTH}x${HEIGHT}, ${Math.round(png.length / 1024)} KB)`);
}
