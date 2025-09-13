import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

type ExportOpts = {
  width?: number;
  height?: number;
  /** Явное количество слайдов на экспорт (перекрывает story.slides.length). */
  count?: number;
};

export async function exportSlides(story: Story, opts: ExportOpts = {}): Promise<Blob[]> {
  const count = typeof opts.count === 'number' ? opts.count : 0;
  if (!count) return [];

  const blobs: Blob[] = [];
  for (let i = 0; i < count; i++) {
    const canvas = await renderSlideToCanvas(story, i, {
      width: opts.width,
      height: opts.height,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob: empty'))), 'image/png');
    });
    blobs.push(blob);
  }
  return blobs;
}
