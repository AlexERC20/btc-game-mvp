import { renderSlideToCanvas, Slide } from '../lib/canvasRender';

export type Story = {
  slides: Slide[];
};

export type ExportOpts = {
  width?: number;
  height?: number;
};

export async function exportSlidesAsFiles(
  story: Story,
  opts: ExportOpts = {}
): Promise<File[]> {
  const files: File[] = [];
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1080;

  for (let i = 0; i < story.slides.length; i++) {
    const slide = story.slides[i];
    const canvas = await renderSlideToCanvas({ ...slide, index: i }, {
      w: width,
      h: height,
      overlay: { enabled: false, heightPct: 0, intensity: 0 },
      text: {
        font: 'sans-serif',
        size: 32,
        lineHeight: 1.2,
        align: 'center',
        color: '#fff',
        titleColor: '#fff',
        titleEnabled: false,
        content: '',
      },
      username: '',
      total: story.slides.length,
    });

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), 'image/png', 0.92)
    );

    const file = new File(
      [blob],
      `slide-${String(i + 1).padStart(2, '0')}.png`,
      { type: 'image/png' }
    );
    files.push(file);
  }

  return files;
}

export async function shareSlides(
  story: Story,
  opts: ExportOpts = {}
): Promise<void> {
  const files = (await exportSlidesAsFiles(story, opts)).slice(0, 10);

  const nav: any = navigator;

  if (nav?.canShare?.({ files })) {
    await nav.share({
      files,
      title: 'Carousel',
    });
    return;
  }

  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

