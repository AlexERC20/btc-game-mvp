import { BASE_FRAME } from '@/features/render/constants';

export type CollageBox = { x: number; y: number; width: number; height: number };

export type CollageBoxes = {
  top: CollageBox;
  bottom: CollageBox;
  divider: { y: number; height: number };
};

export function computeCollageBoxes(dividerPx: number): CollageBoxes {
  const thickness = Math.max(0, dividerPx);
  const half = Math.floor(BASE_FRAME.height / 2);
  const halfLine = thickness / 2;
  const topHeight = Math.max(0, half - halfLine);
  const bottomY = half + halfLine;
  const bottomHeight = Math.max(0, BASE_FRAME.height - bottomY);

  return {
    top: { x: 0, y: 0, width: BASE_FRAME.width, height: topHeight },
    bottom: { x: 0, y: bottomY, width: BASE_FRAME.width, height: bottomHeight },
    divider: { y: half - halfLine, height: thickness },
  };
}

export function computeCoverScale(
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
): number {
  if (!imageWidth || !imageHeight || !boxWidth || !boxHeight) {
    return 1;
  }
  return Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
}

