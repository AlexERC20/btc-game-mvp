import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

type ExportOpts = { width?: number; height?: number };

export async function exportSlides(story: Story, opts: ExportOpts = {}): Promise<Blob[]> {
  const blobs: Blob[] = [];
  for (let i = 0; i < story.slides.length; i++) {
    const canvas = await renderSlideToCanvas(story, i, opts);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
        'image/png',
        0.95,
      );
    });
    blobs.push(blob);
  }
  return blobs;
}
