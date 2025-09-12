import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>(res =>
    canvas.toBlob(b => res(b), 'image/png', 0.92)
  );
  if (blob) return blob;

  const dataUrl = canvas.toDataURL('image/png');
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

export async function exportSlidesAsFiles(story: Story): Promise<File[]> {
  const files: File[] = [];
  const max = Math.min(10, story.slides.length);
  for (let i = 0; i < max; i++) {
    const canvas = await renderSlideToCanvas(story, i);
    const blob = await canvasToPngBlob(canvas);
    files.push(
      new File([blob], `slide-${String(i + 1).padStart(2, '0')}.png`, {
        type: 'image/png',
      })
    );
  }
  return files;
}

export async function shareSlides(story: Story): Promise<void> {
  const files = await exportSlidesAsFiles(story);
  const nav: any = navigator;

  if (files.length && nav?.share && nav?.canShare?.({ files })) {
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
