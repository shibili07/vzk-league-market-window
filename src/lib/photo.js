// Removes the background in the browser. The model is fetched on first use
// (needs internet once, then the browser caches it) and is only loaded when
// a photo is actually uploaded.
export async function stripBackground(file, onProgress) {
  const { removeBackground } = await import('@imgly/background-removal');
  return removeBackground(file, {
    output: { format: 'image/png' },
    progress: onProgress,
  });
}

const ALPHA_CUTOFF = 24;

const toBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// WebP keeps transparency at a fraction of PNG size; fall back to PNG if the
// browser cannot encode it.
async function encode(canvas, quality = 0.9) {
  const webp = await toBlob(canvas, 'image/webp', quality);
  return webp?.type === 'image/webp' ? webp : toBlob(canvas, 'image/png');
}

// Bounding box of the visible (non-transparent) pixels, in bitmap coordinates.
// An opaque photo gives the whole image.
function subjectBox(bitmap) {
  const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > ALPHA_CUTOFF) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w: bitmap.width, h: bitmap.height };

  const x0 = Math.max(0, Math.floor((minX - 1) / scale));
  const y0 = Math.max(0, Math.floor((minY - 1) / scale));
  const x1 = Math.min(bitmap.width, Math.ceil((maxX + 2) / scale));
  const y1 = Math.min(bitmap.height, Math.ceil((maxY + 2) / scale));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Crops to the player. With upperBody, a tall full-length figure is cut to the
// head-and-torso, so the face is large on the card like the template sample.
// Returns the input untouched when there is nothing to crop.
export async function cropToSubject(blob, { upperBody = false, maxWidth = 1400 } = {}) {
  const bitmap = await createImageBitmap(blob);
  try {
    const box = subjectBox(bitmap);

    if (upperBody && box.h / box.w > 1.5) {
      box.h = Math.min(box.h, Math.round(Math.max(box.h * 0.5, box.w * 1.3)));
    }

    const untouched = box.x === 0 && box.y === 0 && box.w === bitmap.width && box.h === bitmap.height;
    if (untouched && bitmap.width <= maxWidth) return blob;

    const scale = Math.min(1, maxWidth / box.w, (maxWidth * 2) / box.h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(box.w * scale);
    canvas.height = Math.round(box.h * scale);
    canvas
      .getContext('2d')
      .drawImage(bitmap, box.x, box.y, box.w, box.h, 0, 0, canvas.width, canvas.height);
    return await encode(canvas, 0.92);
  } finally {
    bitmap.close();
  }
}

// What gets saved: the player trimmed of empty margins and capped in size.
export const compressPhoto = (blob) => cropToSubject(blob, { maxWidth: 1200 });

// What gets shown on the card: the same, framed to the upper body.
export const frameForCard = (blob) => cropToSubject(blob, { upperBody: true });
