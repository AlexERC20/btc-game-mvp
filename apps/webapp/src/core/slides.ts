import { splitToSlides } from './autoSplit';
import { CANVAS_PRESETS, PADDING } from './constants';
import type { Slide, PhotoMeta, Theme, CanvasMode } from '../types';

export type LayoutState = {
  textPosition: 'top' | 'bottom';
  textSize: number;
  lineHeight: number;
};

export type ColorState = Record<string, any>;

export type RecomputeArgs = {
  mode: CanvasMode;
  template: Theme;
  layout: LayoutState;
  color: ColorState;
  slidesText: string;
  photos: PhotoMeta[];
  username: string;
};

// Simple composer that pairs text slides with photos
export function composeSlides({ texts, photos }: { texts: string[]; photos: PhotoMeta[] }): Slide[] {
  const max = Math.max(texts.length, photos.length);
  const lastImage = photos.map(p => p.url).filter(Boolean).pop();
  const result: Slide[] = [];
  for (let i = 0; i < max; i++) {
    result.push({ body: texts[i] || '', image: photos[i]?.url || lastImage });
  }
  return result;
}

export function recomputeSlides(args: RecomputeArgs): Slide[] {
  const { mode, layout, slidesText, photos } = args;
  const preset = CANVAS_PRESETS[mode];
  const texts = splitToSlides(slidesText, {
    fontSize: layout.textSize,
    lineHeight: layout.lineHeight,
    width: preset.w,
    height: preset.h,
    padding: PADDING,
  });
  return composeSlides({ texts, photos });
}

