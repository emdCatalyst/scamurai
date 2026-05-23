/**
 * Maximum raw file size we will even attempt to compress. Anything larger
 * is rejected up-front by the staff form — typically a RAW photo, an
 * accidental video, or a screen recording. 10 MB is well above what any
 * modern phone JPEG produces (~3–6 MB).
 */
export const MAX_RAW_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Maximum dimension (px) on the longest side after resizing. JPEGs from
 * modern phones come in at 4000+ px; 1600 is plenty for reviewing an order
 * photo on a desktop while keeping the file small.
 */
const MAX_DIMENSION = 1600;

/** Default compressed-output size cap. */
const DEFAULT_MAX_OUTPUT_KB = 150;

/**
 * Compresses an image file client-side using the Canvas API.
 * Default target: ≤ 150 KB. Visible quality is preserved for review purposes.
 *
 * @param file The original image file from the input
 * @param maxSizeKB The target maximum size in KB (default 150)
 * @returns A Promise resolving to a compressed Blob
 */
export async function compressImage(
  file: File,
  maxSizeKB = DEFAULT_MAX_OUTPUT_KB
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // 1. Reduce dimensions if > MAX_DIMENSION on longest side (keep aspect ratio).
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_DIMENSION;
            width = MAX_DIMENSION;
          } else {
            width = (width / height) * MAX_DIMENSION;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 2. Re-encode as JPEG, walking down the quality ladder until we're
        //    under maxSizeKB. The extra low rungs help hit 150 KB even on
        //    busy images (lots of edges = bigger JPEGs).
        const qualities = [0.78, 0.66, 0.55, 0.45, 0.35, 0.25];

        const tryEncode = (qualityIndex: number) => {
          if (qualityIndex >= qualities.length) {
            // If all qualities fail to reach target, return the last one anyway
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to create blob"));
              },
              "image/jpeg",
              qualities[qualities.length - 1]
            );
            return;
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                if (
                  blob.size <= maxSizeKB * 1024 ||
                  qualityIndex === qualities.length - 1
                ) {
                  resolve(blob);
                } else {
                  tryEncode(qualityIndex + 1);
                }
              } else {
                reject(new Error("Failed to create blob"));
              }
            },
            "image/jpeg",
            qualities[qualityIndex]
          );
        };

        tryEncode(0);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}
