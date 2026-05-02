/**
 * Compresses an image file client-side using the Canvas API.
 * Target: ≤ 300KB. Visible quality is preserved for review purposes.
 * 
 * @param file The original image file from the input
 * @param maxSizeKB The target maximum size in KB (default 300)
 * @returns A Promise resolving to a compressed Blob
 */
export async function compressImage(file: File, maxSizeKB = 300): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 1. Reduce dimensions if > 1920px on longest side (maintain aspect ratio)
        const MAX_DIMENSION = 1920;
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
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 2. Re-encode as JPEG at quality 0.82
        // 3. If still > maxSizeKB, reduce quality iteratively (0.82 → 0.70 → 0.55)
        const qualities = [0.82, 0.70, 0.55, 0.40, 0.25];
        
        const tryEncode = (qualityIndex: number) => {
          if (qualityIndex >= qualities.length) {
            // If all qualities fail to reach target, return the last one anyway
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to create blob'));
              },
              'image/jpeg',
              qualities[qualities.length - 1]
            );
            return;
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                if (blob.size <= maxSizeKB * 1024 || qualityIndex === qualities.length - 1) {
                  resolve(blob);
                } else {
                  tryEncode(qualityIndex + 1);
                }
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            'image/jpeg',
            qualities[qualityIndex]
          );
        };

        tryEncode(0);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
