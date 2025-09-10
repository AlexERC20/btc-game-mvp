import { renderSlideToCanvas } from '../lib/canvasRender';

type Story = { slides: unknown[] };

type ExportOpts = {
  width?: number;
  height?: number;
};

export async function exportSlides(
  story: Story,
  opts: ExportOpts = {}
): Promise<Blob[]> {
  const blobs: Blob[] = [];

  for (let i = 0; i < story.slides.length; i++) {
    const canvas = await renderSlideToCanvas(story, i, opts);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b as Blob), 'image/png', 1);
    });
    blobs.push(blob);
  }

  return blobs;
}
