import type { TextLayout } from '@/state/store';

type TextRectOptions = {
  blockHeight?: number;
  vOffset?: number;
};

export function getTextRect(
  frameWidth: number,
  frameHeight: number,
  layout: TextLayout,
  options: TextRectOptions = {},
) {
  const margin = layout.safeArea ? 24 : 0;
  const safeWidth = Math.max(0, frameWidth - margin * 2);
  const rawWidth = layout.blockWidth > 0 ? layout.blockWidth : safeWidth;
  const width = Math.max(0, Math.min(rawWidth, safeWidth));

  const availableHeight = Math.max(0, frameHeight - margin * 2);
  const rawHeight = options.blockHeight ?? availableHeight;
  const heightLimit = availableHeight > 0 ? availableHeight : frameHeight;
  const height = Math.max(0, Math.min(rawHeight, heightLimit));

  let x = margin;
  if (layout.hAlign === 'center') {
    x = (frameWidth - width) / 2;
  } else if (layout.hAlign === 'right') {
    x = frameWidth - margin - width;
  }
  const maxX = frameWidth - margin - width;
  x = Math.max(margin, Math.min(x, maxX));

  let y = margin;
  if (layout.vAlign === 'middle') {
    y = margin + (availableHeight - height) / 2;
  } else if (layout.vAlign === 'bottom') {
    y = frameHeight - margin - height;
  }

  const offset = options.vOffset ?? 0;
  const maxY = Math.max(margin, frameHeight - margin - height);
  y = Math.max(margin, Math.min(y + offset, maxY));

  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(width),
    h: Math.round(height),
  };
}
