import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

export async function exportSlidesAsFiles(story: Story): Promise<File[]> {
  const files: File[] = [];
  for (let i = 0; i < story.slides.length; i++) {
    const canvas = await renderSlideToCanvas(story, i);
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), 'image/png', 0.92)
    );
    files.push(
      new File([blob], `slide-${String(i + 1).padStart(2, '0')}.png`, {
        type: 'image/png',
      })
    );
  }
  return files;
}

export async function shareSlides(story: Story): Promise<void> {
  const files = (await exportSlidesAsFiles(story)).slice(0, 10);
  const nav: any = navigator;

  if (files.length && nav?.canShare?.({ files }) && nav?.share) {
    await nav.share({ files, title: 'Carousel' });
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
