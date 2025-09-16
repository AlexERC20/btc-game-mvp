import type { LayoutConfig } from '@/state/store';

export function resolveBlockWidth(
  containerWidth: number,
  layout: LayoutConfig,
): { blockWidth: number; textWidth: number } {
  const raw = layout.blockWidth > 0 ? layout.blockWidth : containerWidth;
  const clamped = Math.min(Math.max(raw, 0), containerWidth);
  const blockWidth = Math.max(clamped, layout.padding * 2);
  const textWidth = Math.max(0, blockWidth - layout.padding * 2);
  return { blockWidth, textWidth };
}

export function resolveBlockPosition(
  containerWidth: number,
  containerHeight: number,
  layout: LayoutConfig,
  blockWidth: number,
  blockHeight: number,
): { x: number; y: number } {
  let x: number;
  switch (layout.horizontal) {
    case 'center':
      x = (containerWidth - blockWidth) / 2;
      break;
    case 'right':
      x = containerWidth - blockWidth;
      break;
    default:
      x = 0;
      break;
  }

  let y: number;
  switch (layout.vertical) {
    case 'top':
      y = layout.vOffset;
      break;
    case 'middle':
      y = (containerHeight - blockHeight) / 2 + layout.vOffset;
      break;
    default:
      y = containerHeight - blockHeight + layout.vOffset;
      break;
  }

  const maxX = containerWidth - blockWidth;
  const maxY = containerHeight - blockHeight;
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
}
