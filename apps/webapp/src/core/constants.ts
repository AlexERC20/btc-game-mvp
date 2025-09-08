export const CANVAS_PRESETS = {
  story: { w: 1080, h: 1920, ratio: 9 / 16 },
  carousel: { w: 1080, h: 1350, ratio: 4 / 5 },
} as const;
export type CanvasMode = keyof typeof CANVAS_PRESETS;

export const PADDING = 48;
