/**
 * Shrinks a camera photo for upload: longest side at most 1600 px, JPEG,
 * usually 150–300 KB, which is plenty to read a bag seal or a receipt.
 *
 * Built for old, low-memory phones: the photo is decoded straight to the
 * smaller size where the browser can (createImageBitmap), never through a
 * base64 data URL, and the canvas memory is released right away. Call it once
 * per photo, right after capture, so nothing is left to do on submit.
 */

const MAX_DIMENSION = 1600;
/** Tried in order until the photo fits the target size. */
const QUALITIES = [0.72, 0.6, 0.5];

type Decoded = ImageBitmap | HTMLImageElement;

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Width only: the browser keeps the aspect ratio and the EXIF rotation.
      return await createImageBitmap(file, { resizeWidth: MAX_DIMENSION, resizeQuality: 'medium' });
    } catch {
      // Older browsers reject the options; fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode photo'))), 'image/jpeg', quality)
  );
}

export async function compressImage(file: Blob, maxSizeKB = 300): Promise<Blob> {
  const source = await decode(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if ('close' in source) source.close();

    let blob: Blob | undefined;
    for (const quality of QUALITIES) {
      blob = await toJpeg(canvas, quality);
      if (blob.size <= maxSizeKB * 1024) break;
    }
    return blob!;
  } finally {
    // Release the pixel buffer now instead of waiting for garbage collection.
    canvas.width = 0;
    canvas.height = 0;
  }
}
