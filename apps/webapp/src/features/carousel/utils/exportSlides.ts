import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

type ExportOpts = {
  width?: number;
  height?: number;
  count?: number; // сколько экспортировать — не полагаться на story.slides
};

// Полифилл для Safari (когда canvas.toBlob недоступен или возвращает null)
async function canvasToBlobSafe(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), type, quality);
    } catch {
      resolve(null);
    }
  });
  if (blob) return blob;

  // fallback через dataURL
  const dataURL = canvas.toDataURL(type, quality);
  const base64 = dataURL.split(',')[1];
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

export async function exportSlides(story: Story, opts: ExportOpts = {}): Promise<Blob[]> {
  const count = typeof opts.count === 'number' ? opts.count : Array.isArray((story as any)?.slides) ? (story as any).slides.length : 0;
  if (!count || count <= 0) return [];

  const blobs: Blob[] = [];

  for (let i = 0; i < count; i++) {
    // адаптер под разные формы ответа renderSlideToCanvas
    const maybe = await renderSlideToCanvas(story, i, { width: opts.width, height: opts.height });
    const canvas: HTMLCanvasElement | null =
      (maybe && typeof (maybe as any).toDataURL === 'function')
        ? (maybe as HTMLCanvasElement)
        : (maybe && (maybe as any).canvas && typeof (maybe as any).canvas.toDataURL === 'function')
          ? ((maybe as any).canvas as HTMLCanvasElement)
          : null;

    if (!canvas) {
      throw new Error('renderSlideToCanvas() did not return a canvas');
    }

    const blob = await canvasToBlobSafe(canvas, 'image/png');
    blobs.push(blob);
  }

  return blobs;
}

