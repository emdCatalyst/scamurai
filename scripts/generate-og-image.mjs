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
 * The card is the Misdaq identity at its plainest: the stacked logo (مصداق
 * above MISDAQ) in white on Misdaq Black, inside the corners of the proof
 * frame, with one orange mark for the order evidence product. Everything is
 * drawn from the SVGs in public/brand, so no font is needed. Re-run after
 * changing a logo file, and commit the outputs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'src', 'app', '[locale]', '(marketing)');
const LOGO_FILE = path.join(ROOT, 'public', 'brand', 'logo-stacked.svg');

/** Describes everything the image shows; one string serves both locales. */
const ALT_TEXT = 'Misdaq · مصداق';

const COLOR = { black: '#0B0B0B', white: '#FFFFFF', orange: '#FF5B3A' };

const CARDS = [
  { name: 'opengraph-image', width: 1200, height: 630 },
  { name: 'twitter-image', width: 1200, height: 600 },
];

const LAYOUT = {
  logoWidth: 440,
  /** Proof-frame corners: inset from the card edge, arm length and stroke. */
  frame: { inset: 56, arm: 64, stroke: 4 },
  marker: { width: 72, height: 8, gap: 44 },
};

async function renderLogo() {
  const svg = (await fs.readFile(LOGO_FILE, 'utf8')).replace(/fill="currentColor"/g, `fill="${COLOR.white}"`);
  const { data, info } = await sharp(Buffer.from(svg), { density: 300 })
    .resize({ width: LAYOUT.logoWidth })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

/** Black card with the four corners of the proof frame and the orange marker under the logo. */
function background(width, height, markerTop) {
  const { inset, arm, stroke } = LAYOUT.frame;
  const right = width - inset;
  const bottom = height - inset;
  const corner = (d) => `<path d="${d}" fill="none" stroke="${COLOR.white}" stroke-width="${stroke}" stroke-opacity="0.85"/>`;
  const marker = LAYOUT.marker;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${COLOR.black}"/>
  ${corner(`M ${inset} ${inset + arm} V ${inset} H ${inset + arm}`)}
  ${corner(`M ${right - arm} ${inset} H ${right} V ${inset + arm}`)}
  ${corner(`M ${inset} ${bottom - arm} V ${bottom} H ${inset + arm}`)}
  ${corner(`M ${right - arm} ${bottom} H ${right} V ${bottom - arm}`)}
  <rect x="${(width - marker.width) / 2}" y="${markerTop}" width="${marker.width}" height="${marker.height}" rx="${marker.height / 2}" fill="${COLOR.orange}"/>
</svg>`);
}

async function renderCard({ width, height }, logo) {
  const { marker } = LAYOUT;
  const contentHeight = logo.height + marker.gap + marker.height;
  const top = Math.round((height - contentHeight) / 2);
  return sharp(background(width, height, top + logo.height + marker.gap))
    .composite([{ input: logo.input, left: Math.round((width - logo.width) / 2), top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

const logo = await renderLogo();
for (const card of CARDS) {
  const png = await renderCard(card, logo);
  await fs.writeFile(path.join(OUTPUT_DIR, `${card.name}.png`), png);
  // No trailing newline: Next.js uses the file contents verbatim as the alt attribute.
  await fs.writeFile(path.join(OUTPUT_DIR, `${card.name}.alt.txt`), ALT_TEXT);
  console.log(`wrote ${card.name}.png (${card.width}x${card.height}, ${Math.round(png.length / 1024)} KB) + .alt.txt`);
}
