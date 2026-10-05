import { positionLabel } from '../components/PlayerCard.jsx';

// Draws the card to a canvas at the template's native size (1125 x 1398).
// Positions mirror the CSS in app.css (.pcard), which are percentages of the card.
const W = 1125;
const H = 1398;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });

// Centres a single line on cy the way CSS does for line-height: 1.
function drawLine(ctx, text, x, cy, size, weight, align) {
  ctx.font = `${weight} ${size}px Outfit, sans-serif`;
  ctx.letterSpacing = `${size * 0.01}px`;
  ctx.textAlign = align;
  const m = ctx.measureText(text);
  const ascent = m.fontBoundingBoxAscent ?? size * 0.8;
  const descent = m.fontBoundingBoxDescent ?? size * 0.2;
  ctx.fillText(text, x, cy + (ascent - descent) / 2);
}

const PHOTO_BOX = { x: W * 0.12, y: H * 0.15, w: W * 0.76, h: H * 0.48 };

// The placeholder used when a player has no photo (same shapes as the card on screen).
function drawSilhouette(lctx) {
  const box = PHOTO_BOX;
  const scale = (box.h * 0.88) / 240;
  lctx.save();
  lctx.translate(box.x + (box.w - 200 * scale) / 2, box.y + box.h - 240 * scale);
  lctx.scale(scale, scale);
  lctx.fillStyle = 'rgba(255,255,255,0.28)';
  lctx.beginPath();
  lctx.arc(100, 78, 46, 0, Math.PI * 2);
  lctx.fill();
  lctx.fill(new Path2D('M12 240c0-62 40-96 88-96s88 34 88 96z'));
  lctx.restore();
}

function drawPhoto(ctx, img) {
  const box = PHOTO_BOX;

  // draw on its own layer so the bottom fade only affects the player
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lctx = layer.getContext('2d');
  if (img) {
    const scale = Math.min(box.w / img.width, box.h / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    lctx.drawImage(img, box.x + (box.w - w) / 2, box.y + box.h - h, w, h);
  } else {
    drawSilhouette(lctx);
  }

  const fade = lctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  fade.addColorStop(0.86, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  lctx.globalCompositeOperation = 'destination-in';
  lctx.fillStyle = fade;
  lctx.fillRect(box.x, box.y, box.w, box.h);

  ctx.drawImage(layer, 0, 0);
}

export async function renderCardBlob({ name, position, photoUrl }) {
  await Promise.all(
    ['400', '500', '700'].map((weight) => document.fonts.load(`${weight} 80px Outfit`))
  );

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(await loadImage('/card-template.jpg'), 0, 0, W, H);
  drawPhoto(ctx, photoUrl ? await loadImage(photoUrl) : null);

  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';

  const label = name.trim().toUpperCase();
  const cqw = W / 100;
  drawLine(ctx, position, W * 0.069, H * 0.095, 7.2 * cqw, 500, 'left');
  drawLine(ctx, label, W / 2, H * 0.688, Math.min(8.5, 96 / label.length) * cqw, 500, 'center');
  drawLine(ctx, 'POSITION', W / 2, H * 0.807, 4.3 * cqw, 400, 'center');
  drawLine(ctx, positionLabel(position).toUpperCase(), W / 2, H * 0.85, 5.3 * cqw, 700, 'center');

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png')
  );
}

export async function downloadCard(player) {
  const blob = await renderCardBlob(player);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug = player.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  link.href = url;
  link.download = `${slug || 'player'}-vzk-card.png`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
