import { splitTextIntoSlides } from './textSplitter';
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
  const { mode, slidesText, photos } = args;
  const texts = splitTextIntoSlides(slidesText, mode, { targetCount: photos.length });
  return composeSlides({ texts, photos });
}

