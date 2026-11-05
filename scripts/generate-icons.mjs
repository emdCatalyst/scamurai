/**
 * Generates the app icons and the email logo from the Misdaq marks in public/brand:
 *
 *   public/icons/icon-192.png, icon-512.png   the mark (rounded black square), transparent corners
 *   public/icons/maskable-512.png             full-bleed black, the ق inside the maskable safe zone
 *   public/icons/apple-touch-icon.png         180×180 full-bleed (iOS rounds the corners itself)
 *   src/app/apple-icon.png                    same as apple-touch-icon, for the marketing pages
 *   src/app/icon.svg                          the mark, for browsers that take SVG favicons
 *   src/app/favicon.ico                       16, 32 and 48 px PNGs in an ICO container
 *   public/brand/email-logo.png               white horizontal logo on black, 2× its 160 px email width
 *
 *   node scripts/generate-icons.mjs
 *
 * Re-run after changing a mark, and commit the outputs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(ROOT, 'public', 'brand');
const ICONS = path.join(ROOT, 'public', 'icons');
const APP = path.join(ROOT, 'src', 'app');

const BLACK = '#0B0B0B';

const markSvg = await fs.readFile(path.join(BRAND, 'mark.svg'), 'utf8');
const glyphPath = markSvg.match(/<path[^>]*\/>/)?.[0];
if (!glyphPath) throw new Error('mark.svg: no glyph path found');

/** The ق and its frame, white, on a square black tile with no rounding, scaled about the centre. */
function fullBleed(scale) {
  const offset = (960 * (1 - scale)) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960">
  <rect width="960" height="960" fill="${BLACK}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${glyphPath}</g>
</svg>`);
}

const png = (input, size) =>
  sharp(input, { density: 300 }).resize(size, size).png({ compressionLevel: 9, palette: true }).toBuffer();

async function write(file, data) {
  await fs.writeFile(file, data);
  console.log(`wrote ${path.relative(ROOT, file)} (${Math.max(1, Math.round(data.length / 1024))} KB)`);
}

/** An ICO file whose images are stored as PNG (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

const mark = Buffer.from(markSvg);
await write(path.join(ICONS, 'icon-192.png'), await png(mark, 192));
await write(path.join(ICONS, 'icon-512.png'), await png(mark, 512));
// The maskable safe zone is a centred circle of 40% radius; the frame's corners must stay inside it.
await write(path.join(ICONS, 'maskable-512.png'), await png(fullBleed(0.72), 512));
const apple = await png(fullBleed(0.9), 180);
await write(path.join(ICONS, 'apple-touch-icon.png'), apple);
await write(path.join(APP, 'apple-icon.png'), apple);
await write(path.join(APP, 'icon.svg'), mark);
await write(
  path.join(APP, 'favicon.ico'),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(mark, size) }))))
);

const horizontal = (await fs.readFile(path.join(BRAND, 'logo-horizontal.svg'), 'utf8')).replace(
  /fill="currentColor"/g,
  'fill="#FFFFFF"'
);
const logo = await sharp(Buffer.from(horizontal), { density: 300 }).resize({ width: 320 }).png().toBuffer();
const { height } = await sharp(logo).metadata();
await write(
  path.join(BRAND, 'email-logo.png'),
  await sharp({ create: { width: 320, height, channels: 3, background: BLACK } })
    .composite([{ input: logo }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()
);
