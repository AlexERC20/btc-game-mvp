import type { PhotoTransform } from '@/state/store';

export type Rect = { x: number; y: number; width: number; height: number };

export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: Rect,
  transform?: PhotoTransform,
) {
  const imageWidth = img.naturalWidth || img.width;
  const imageHeight = img.naturalHeight || img.height;
  if (!imageWidth || !imageHeight) return;

  const { x, y, width, height } = rect;
  if (width <= 0 || height <= 0) return;

  const baseScale = Math.max(width / imageWidth, height / imageHeight);
  const scale = baseScale * (transform?.scale ?? 1);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const offsetX = transform?.offsetX ?? 0;
  const offsetY = transform?.offsetY ?? 0;
  const dx = x + (width - drawWidth) / 2 + offsetX;
  const dy = y + (height - drawHeight) / 2 + offsetY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  ctx.restore();
}
