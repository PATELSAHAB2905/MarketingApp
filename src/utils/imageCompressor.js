/**
 * Client-Side Smart Image Compression Utility
 *
 * Requirements:
 * - Max dimensions: 1280px x 1280px (preserves aspect ratio, no stretching/upscaling)
 * - Preferred format: image/webp (with automatic image/jpeg fallback)
 * - Target compressed size: 50 KB - 150 KB (strict max limit 200 KB)
 * - Maintains clarity for text on receipts, store signboards, and spice packaging
 */

/**
 * Checks if browser canvas supports exporting as WebP
 */
const checkWebPSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    return false;
  }
};

/**
 * Loads an image file or blob into an HTMLImageElement
 */
const loadImage = (source) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image for compression: ' + (err?.message || 'Invalid image')));

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else {
      reject(new Error('Unsupported image source type'));
    }
  });
};

/**
 * Converts a Canvas to a Blob with specified MIME type and quality
 */
const canvasToBlob = (canvas, mimeType, quality) => {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
};

/**
 * Reads a Blob as a Base64 Data URL for instant UI preview
 */
export const blobToDataUrl = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Compresses an image file or blob client-side to target 50 KB - 150 KB (max 200 KB).
 *
 * @param {File|Blob|string} fileOrBlob - Input image file, blob, or data URL
 * @param {Object} options - Compression options
 * @param {number} [options.maxDimension=1280] - Maximum width or height in pixels
 * @param {number} [options.minKb=50] - Desired minimum file size in KB
 * @param {number} [options.targetKb=120] - Desired target file size in KB
 * @param {number} [options.maxKb=200] - Hard upper limit file size in KB
 * @returns {Promise<{
 *   blob: Blob,
 *   dataUrl: string,
 *   originalSizeKb: number,
 *   compressedSizeKb: number,
 *   mimeType: string,
 *   width: number,
 *   height: number,
 *   compressionRatio: number
 * }>}
 */
export async function compressImage(fileOrBlob, options = {}) {
  if (!fileOrBlob) {
    throw new Error('No image file or blob provided for compression');
  }

  const {
    maxDimension = 1280,
    minKb = 50,
    targetKb = 120,
    maxKb = 200,
  } = options;

  const originalSizeKb = fileOrBlob.size
    ? Math.round(fileOrBlob.size / 1024)
    : (typeof fileOrBlob === 'string' ? Math.round((fileOrBlob.length * 3) / 4 / 1024) : 0);

  // 1. Determine optimal output MIME type
  const isWebPSupported = checkWebPSupport();
  const outputMimeType = isWebPSupported ? 'image/webp' : 'image/jpeg';

  // 2. Load image element
  let objectUrlToRevoke = null;
  let img;
  try {
    if (fileOrBlob instanceof Blob || fileOrBlob instanceof File) {
      objectUrlToRevoke = URL.createObjectURL(fileOrBlob);
      img = await loadImage(objectUrlToRevoke);
    } else {
      img = await loadImage(fileOrBlob);
    }
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }

  let srcWidth = img.naturalWidth || img.width;
  let srcHeight = img.naturalHeight || img.height;

  if (!srcWidth || !srcHeight) {
    throw new Error('Unable to read image dimensions');
  }

  // 3. Calculate aspect-ratio preserved dimensions (max 1280px)
  let currentMaxDim = maxDimension;
  let targetWidth = srcWidth;
  let targetHeight = srcHeight;

  if (targetWidth > currentMaxDim || targetHeight > currentMaxDim) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * currentMaxDim) / targetWidth);
      targetWidth = currentMaxDim;
    } else {
      targetWidth = Math.round((targetWidth * currentMaxDim) / targetHeight);
      targetHeight = currentMaxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // High quality resampling settings
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 4. Iterative Smart Quality Adjustment (Binary / Gradient Search)
  let lowQ = 0.35;
  let highQ = 0.92;
  let bestBlob = null;
  let bestSizeKb = 0;
  let bestQuality = 0.8;

  // Perform up to 6 iterations to hone in on target size range
  for (let iteration = 0; iteration < 6; iteration++) {
    const q = (lowQ + highQ) / 2;
    const blob = await canvasToBlob(canvas, outputMimeType, q);
    if (!blob) break;

    const sizeKb = Math.round(blob.size / 1024);
    bestBlob = blob;
    bestSizeKb = sizeKb;
    bestQuality = q;

    // Ideal range: 50 KB to targetKb (120-150 KB)
    if (sizeKb >= minKb && sizeKb <= targetKb) {
      break;
    } else if (sizeKb > targetKb) {
      highQ = q; // Size too big, reduce quality
    } else {
      lowQ = q; // Size too small, increase quality for better readability
    }
  }

  // 5. Safety check: If still above maxKb (200 KB), scale dimensions down slightly & re-compress
  if (bestSizeKb > maxKb) {
    const scaleFactor = 0.8;
    const scaledWidth = Math.round(targetWidth * scaleFactor);
    const scaledHeight = Math.round(targetHeight * scaleFactor);

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

    bestBlob = await canvasToBlob(canvas, outputMimeType, 0.65);
    bestSizeKb = Math.round((bestBlob?.size || 0) / 1024);
    targetWidth = scaledWidth;
    targetHeight = scaledHeight;
  }

  // Generate lightweight preview data URL
  const dataUrl = bestBlob ? await blobToDataUrl(bestBlob) : canvas.toDataURL(outputMimeType, bestQuality);
  const finalSizeKb = bestBlob ? Math.round(bestBlob.size / 1024) : Math.round((dataUrl.length * 3) / 4 / 1024);
  const compressionRatio = originalSizeKb > 0 ? Math.round(((originalSizeKb - finalSizeKb) / originalSizeKb) * 100) : 0;

  return {
    blob: bestBlob,
    dataUrl,
    originalSizeKb: originalSizeKb || finalSizeKb,
    compressedSizeKb: finalSizeKb,
    mimeType: outputMimeType,
    width: targetWidth,
    height: targetHeight,
    compressionRatio: Math.max(0, compressionRatio),
  };
}

/**
 * Formats byte or KB sizes into readable Indian English strings (e.g. "92 KB" or "2.4 MB")
 */
export function formatFileSize(sizeInKb) {
  if (!sizeInKb || isNaN(sizeInKb)) return '0 KB';
  if (sizeInKb >= 1024) {
    return `${(sizeInKb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(sizeInKb)} KB`;
}
