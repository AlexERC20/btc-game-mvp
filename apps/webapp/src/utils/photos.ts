import type { Photo } from '@/state/store';
import { usePhotos } from '@/state/store';

const URL_PATTERN = /^(https?:\/\/|data:|blob:)/i;

export function resolvePhotoSource(ref: string | undefined, photos: Photo[]): string | undefined {
  if (!ref) return undefined;
  const found = photos.find((p) => p.id === ref);
  if (found) return found.src;
  if (URL_PATTERN.test(ref)) return ref;
  return undefined;
}

export function resolvePhotoFromStore(ref: string | undefined): string | undefined {
  return resolvePhotoSource(ref, usePhotos.getState().items);
}
