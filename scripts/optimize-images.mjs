/**
 * optimize-images.mjs: pre-renders heavy design exports into web-ready AVIF + WebP.
 *
 * Why
 *   Illustrator exports the landing hero art and the "Scamurai x Vision 2030"
 *   lock-up as SVG files that only wrap base64 PNGs (about 1.8 MB and 235 KB).
 *   Shipping them as-is costs a large download plus a full SVG parse and decode
 *   before anything paints. Rendering them once, offline, keeps the originals as
 *   the editable source of truth and ships a small fraction of the bytes.
 *
 * Usage
 *   node scripts/optimize-images.mjs
 *   Re-run after changing a source file and commit the outputs. The site never
 *   runs sharp at build or request time. sharp ships with Next.js (optional
 *   dependency), so there is nothing extra to install.
 *
 * Outputs (consumed by src/components/landing/HeroBackdrop.tsx and Vision2030Strip.tsx)
 *   public/assets/hero/kingdom-tower-1920.{avif,webp}    full 1920x1080 composition
 *   public/assets/hero/kingdom-tower-768.{avif,webp}     768x1080 centre crop for narrow viewports
 *   public/assets/vision-2030/scamurai-x-vision-2030-480.{avif,webp}   480 px wide (3x its 160 px slot)
 *
 * Notes
 *   - The hero is displayed at one CSS pixel per SVG unit, top-centred, exactly
 *     like the CSS background it replaces. A centre crop therefore keeps the
 *     composition as long as it is at least as wide as the widest viewport that
 *     receives it (HeroBackdrop serves the 768 crop below 768px).
 *   - The hero source embeds 1x bitmaps, so a 2x render would only upscale them:
 *     more bytes, no extra detail. Export a higher-resolution source to change that.
 *   - The hero keeps its alpha channel so it blends into the CSS gradient behind
 *     it. The lock-up is flattened onto the Vision strip's solid offwhite
 *     background instead: its anti-aliased alpha would cost almost 4x the bytes.
 *   - Encoder settings were tuned by eye against the source: below these values
 *     the navy glow starts to band and the tower facade loses its grid lines.
 */
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FORMATS = {
  avif: (image) => image.avif({ quality: 60, effort: 9 }),
  webp: (image) => image.webp({ quality: 75, alphaQuality: 80, effort: 6, smartSubsample: true }),
};

/**
 * @typedef {{ name: string, cropWidth?: number, width?: number }} Variant
 *   `cropWidth` takes a full-height centre crop; `width` resizes proportionally.
 * @typedef {{ source: string, outDir: string, flatten?: string, variants: Variant[] }} Job
 *   `flatten` replaces transparency with a solid colour.
 */

/** @type {Job[]} */
const JOBS = [
  {
    source: 'public/assets/landing page.svg',
    outDir: 'public/assets/hero',
    variants: [{ name: 'kingdom-tower-1920' }, { name: 'kingdom-tower-768', cropWidth: 768 }],
  },
  {
    source: 'public/logos/scamurai x 2030 saudi vision.svg',
    outDir: 'public/assets/vision-2030',
    // Tailwind `bg-offwhite`, the Vision strip's background.
    flatten: '#f2f2f2',
    variants: [{ name: 'scamurai-x-vision-2030-480', width: 480 }],
  },
];

/** Renders an SVG at one pixel per user unit (72 dpi is sharp's 1:1 density). */
async function rasterize(file) {
  const { data, info } = await sharp(file, { density: 72 }).png().toBuffer({ resolveWithObject: true });
  return { png: data, width: info.width, height: info.height };
}

/**
 * @param {{ png: Buffer, width: number, height: number }} render
 * @param {Variant} variant
 * @param {string | undefined} background
 */
function shape(render, variant, background) {
  const image = background ? sharp(render.png).flatten({ background }) : sharp(render.png);
  if (variant.cropWidth) {
    const left = Math.round((render.width - variant.cropWidth) / 2);
    return image.extract({ left, top: 0, width: variant.cropWidth, height: render.height });
  }
  if (variant.width) {
    return image.resize({ width: variant.width, kernel: 'lanczos3' });
  }
  return image;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function run() {
  for (const job of JOBS) {
    const sourcePath = path.join(ROOT, job.source);
    const outDir = path.join(ROOT, job.outDir);
    await mkdir(outDir, { recursive: true });

    const render = await rasterize(sourcePath);
    console.log(`\n${job.source}  ${kb((await stat(sourcePath)).size)}  (${render.width}x${render.height})`);

    for (const variant of job.variants) {
      for (const [extension, encode] of Object.entries(FORMATS)) {
        const target = path.join(outDir, `${variant.name}.${extension}`);
        const info = await encode(shape(render, variant, job.flatten)).toFile(target);
        console.log(`  -> ${path.relative(ROOT, target)}  ${kb(info.size)}  (${info.width}x${info.height})`);
      }
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
