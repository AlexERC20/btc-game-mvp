import type { Slide } from '@/state/store';

function hasNonEmptyText(slide: Slide): boolean {
  const candidate = slide.text?.title ?? slide.text?.body ?? slide.body;
  if (typeof candidate === 'string') {
    return candidate.trim().length > 0;
  }
  if (!candidate) return false;
  const maybeTrim = (candidate as unknown as { trim?: () => string }).trim;
  return typeof maybeTrim === 'function' ? maybeTrim.call(candidate).length > 0 : false;
}

export function slideIsEmpty(slide: Slide): boolean {
  const hasText = hasNonEmptyText(slide);
  if (slide.template === 'collage-50') {
    const hasTop = Boolean(slide.collage50?.top.photoId);
    const hasBottom = Boolean(slide.collage50?.bottom.photoId);
    return !hasText && !hasTop && !hasBottom;
  }

  const singleSlot = slide.single as unknown as { photoId?: string } | undefined;
  const singlePhotoId = singleSlot?.photoId ?? slide.photoId ?? slide.image;
  const hasPhoto = Boolean(singlePhotoId);
  return !hasText && !hasPhoto;
}
