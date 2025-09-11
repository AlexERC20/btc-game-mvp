import { renderSlideToCanvas } from '../lib/canvasRender';
import type { Story } from '../../../core/story';

type ExportOpts = {
  width?: number;
  height?: number;
};

/**
 * Рендерим ВСЕ слайды в PNG и отдаём массив Blob'ов.
 * Никаких ZIP — дальше пусть решает UI (share-sheet или download).
 */
export async function exportSlides(
  story: Story,
  opts: ExportOpts = {}
): Promise<Blob[]> {
  const blobs: Blob[] = [];

  for (let i = 0; i < story.slides.length; i++) {
    // canvasRender уже учитывает текущий layout/template/fonts из story/uiOptions
    // @ts-ignore -- renderSlideToCanvas signature may vary
    const canvas = await renderSlideToCanvas(story, i, opts);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b as Blob), 'image/png', 1);
    });

    blobs.push(blob);
  }

  return blobs;
}
