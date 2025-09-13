import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

type ExportOpts = {
  width?: number;
  height?: number;
};

/**
 * Рендерим ВСЕ слайды в PNG и возвращаем массив Blob.
 * Без ZIP — дальше UI решает (share / download).
 */
export async function exportSlides(
  story: Story,
  opts: ExportOpts = {}
): Promise<Blob[]> {
  const result: Blob[] = [];

  if (!story?.slides?.length) return result;

  // локальный помощник: надёжная конвертация canvas → Blob
  async function canvasToBlobSafe(canvas: HTMLCanvasElement): Promise<Blob> {
    // OffscreenCanvas API
    const anyCanvas: any = canvas as any;
    if (anyCanvas?.convertToBlob) {
      return await anyCanvas.convertToBlob({ type: 'image/png' });
    }

    // стандартный toBlob
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (blob) return blob;

    // крайний фолбэк через dataURL
    const dataURL = canvas.toDataURL('image/png');
    const res = await fetch(dataURL);
    return await res.blob();
  }

  for (let i = 0; i < story.slides.length; i++) {
    try {
      const canvas = await renderSlideToCanvas(story, i, opts);
      // защита от рендера с нулевыми размерами
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.warn('[exportSlides] skip zero-size canvas at index', i);
        continue;
      }
      const blob = await canvasToBlobSafe(canvas);
      result.push(blob);
    } catch (err) {
      console.error('[exportSlides] slide failed at index', i, err);
      // продолжаем остальные слайды
    }
  }

  return result;
}
