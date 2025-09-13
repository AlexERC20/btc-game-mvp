import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

type ExportOpts = { width?: number; height?: number; indices?: number[] };

export async function exportSlides(story: Story, opts: ExportOpts = {}): Promise<Blob[]> {
  const { indices } = opts;
  const blobs: Blob[] = [];

  const slideIndexes = indices ?? story.slides.map((_, i) => i); // no filtering by content

  for (const i of slideIndexes) {
    const canvas = await renderSlideToCanvas(story, i, {
      width: opts.width,
      height: opts.height,
    });

    const blob: Blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) return reject(new Error('canvas.toBlob returned null'));
        resolve(b);
      }, 'image/png', 0.92);
    });

    blobs.push(blob);
  }

  return blobs;
}
