import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

type ExportOpts = {
  width?: number;
  height?: number;
  /** Сколько слайдов экспортировать. Критично: не полагаться на story.slides */
  count?: number;
};

/**
 * Рендерим ВСЕ слайды в PNG и возвращаем массив Blob'ов.
 * Никаких ZIP — дальше решает UI (share-sheet / download).
 */
export async function exportSlides(
  story: Story,
  opts: ExportOpts = {},
): Promise<Blob[]> {
  const count =
    typeof opts.count === 'number'
      ? opts.count
      : (Array.isArray((story as any)?.slides) ? (story as any).slides.length : 0);

  if (!count || count <= 0) return [];

  const blobs: Blob[] = [];

  for (let i = 0; i < count; i++) {
    // canvasRender учитывает текущие layout/fonts/theme из story/state
    const canvas = await renderSlideToCanvas(story, i, {
      width: opts.width,
      height: opts.height,
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob: empty'))),
        'image/png',
      );
    });

    blobs.push(blob);
  }

  return blobs;
}
