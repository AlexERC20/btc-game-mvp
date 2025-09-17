import type { Slide } from '@/state/store';
import { slideIsEmpty } from '@/utils/slideIsEmpty';

export function getExportSlides(slides: Slide[]): Slide[] {
  if (!Array.isArray(slides) || slides.length === 0) {
    return [];
  }

  let lastNonEmptyIndex = -1;
  slides.forEach((slide, index) => {
    if (!slideIsEmpty(slide)) {
      lastNonEmptyIndex = index;
    }
  });

  if (lastNonEmptyIndex >= 0) {
    return slides.slice(0, lastNonEmptyIndex + 1);
  }

  return slides.slice(0, 1);
}
