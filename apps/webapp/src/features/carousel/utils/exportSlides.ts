import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

type ExportOpts = {
  width?: number;
  height?: number;
  /** Явное количество слайдов на экспорт (перекрывает story.slides.length). */
  count?: number;
};

/** Безопасный toBlob с фолбэком через dataURL на платформах, где canvas.toBlob может вернуть null. */
function canvasToBlobSafe(canvas: HTMLCanvasElement, type: string = 'image/png', quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    // Современный путь
    if ('toBlob' in canvas) {
      canvas.toBlob((b) => {
        if (b) return resolve(b);
        // fallback если вернулось null (Safari/старый iOS)
        try {
          const dataUrl = canvas.toDataURL(type, quality);
          const bstr = atob(dataUrl.split(',')[1] || '');
          const len = bstr.length;
          const u8 = new Uint8Array(len);
          for (let i = 0; i < len; i++) u8[i] = bstr.charCodeAt(i);
          resolve(new Blob([u8], { type }));
        } catch (e) {
          reject(e);
        }
      }, type, quality);
      return;
    }
    // Очень старые движки
    try {
      const dataUrl = canvas.toDataURL(type, quality);
      const bstr = atob(dataUrl.split(',')[1] || '');
      const len = bstr.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = bstr.charCodeAt(i);
      resolve(new Blob([u8], { type }));
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Рендерим слайды в PNG и возвращаем массив Blob'ов.
 * ZIP не делаем — дальше решает UI (share-sheet / download).
 */
export async function exportSlides(
  story: Story,
  opts: ExportOpts = {},
): Promise<Blob[]> {
  const count =
    typeof opts.count === 'number'
      ? opts.count
      : Array.isArray((story as any)?.slides)
      ? (story as any).slides.length
      : 0;

  if (!count || count <= 0) return [];

  const blobs: Blob[] = [];

  for (let i = 0; i < count; i++) {
    // canvasRender учитывает текущие layout/fonts/theme из story/state
    const canvas = await renderSlideToCanvas(story, i, {
      width: opts.width,
      height: opts.height,
    });

    const blob = await canvasToBlobSafe(canvas, 'image/png');
    blobs.push(blob);
  }

  return blobs;
}
