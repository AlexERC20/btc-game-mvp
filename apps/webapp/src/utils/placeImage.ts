import type { PhotoTransform } from '@/state/store';

export type PlacementBox = { x: number; y: number; width: number; height: number };

export type PlacedImage = { left: number; top: number; width: number; height: number };

const DEFAULT_TRANSFORM: PhotoTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export function placeImage(
  box: PlacementBox,
  imageWidth: number,
  imageHeight: number,
  transform?: PhotoTransform | null,
): PlacedImage {
  const boxWidth = Math.max(0, box.width);
  const boxHeight = Math.max(0, box.height);
  const sourceWidth = Math.max(0, imageWidth);
  const sourceHeight = Math.max(0, imageHeight);

  if (!boxWidth || !boxHeight || !sourceWidth || !sourceHeight) {
    return { left: box.x, top: box.y, width: boxWidth, height: boxHeight };
  }

  const t = transform ?? DEFAULT_TRANSFORM;
  const baseScale = Math.max(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const scale = baseScale * (t.scale ?? DEFAULT_TRANSFORM.scale);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const offsetX = t.offsetX ?? DEFAULT_TRANSFORM.offsetX;
  const offsetY = t.offsetY ?? DEFAULT_TRANSFORM.offsetY;
  const left = box.x + (boxWidth - width) / 2 + offsetX;
  const top = box.y + (boxHeight - height) / 2 + offsetY;

  return { left, top, width, height };
}
