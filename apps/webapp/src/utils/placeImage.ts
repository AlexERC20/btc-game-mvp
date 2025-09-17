import type { PhotoTransform } from '@/state/store';

export type PlacementBox = { x: number; y: number; w: number; h: number };

export type PlacedImage = { left: number; top: number; width: number; height: number; scale0: number };

export function placeImage(
  box: PlacementBox,
  imageWidth: number,
  imageHeight: number,
  transform?: PhotoTransform | null,
): PlacedImage {
  const boxWidth = Math.max(0, box.w);
  const boxHeight = Math.max(0, box.h);
  const sourceWidth = Math.max(0, imageWidth);
  const sourceHeight = Math.max(0, imageHeight);

  if (!boxWidth || !boxHeight || !sourceWidth || !sourceHeight) {
    return { left: box.x, top: box.y, width: boxWidth, height: boxHeight, scale0: 1 };
  }

  const scale0 = Math.max(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const scale = scale0 * (transform?.scale ?? 1);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const offsetX = transform?.offsetX ?? 0;
  const offsetY = transform?.offsetY ?? 0;
  const left = box.x + (boxWidth - width) / 2 + offsetX;
  const top = box.y + (boxHeight - height) / 2 + offsetY;

  return { left, top, width, height, scale0 };
}
