export type CollageSlotBox = { x: number; y: number; w: number; h: number };

export type CollageBoxes = {
  top: CollageSlotBox;
  bot: CollageSlotBox;
};

export function getCollageBoxes(frameW: number, frameH: number, dividerPx: number): CollageBoxes {
  const width = Math.max(0, frameW);
  const safeFrameH = Math.max(0, frameH);
  const safeDivider = Math.min(Math.max(0, dividerPx), safeFrameH);

  const hTop = Math.floor((safeFrameH - safeDivider) / 2);
  const hBot = safeFrameH - safeDivider - hTop;

  const top: CollageSlotBox = { x: 0, y: 0, w: width, h: hTop };
  const bot: CollageSlotBox = { x: 0, y: hTop + safeDivider, w: width, h: hBot };

  return { top, bot };
}
