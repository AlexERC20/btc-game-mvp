import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

// unified logger
function log(...args: any[]) {
  console.info('[share]', ...args);
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>(res =>
    canvas.toBlob(b => res(b), 'image/png', 0.92)
  );
  if (blob) return blob;

  // диагностический фолбэк — полезно при tainted canvas/шрифтах
  log('toBlob(null) → fallback toDataURL');
  const dataUrl = canvas.toDataURL('image/png');
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

/** Рендерим (макс. 10) слайдов в файловый массив PNG */
export async function exportSlidesAsFiles(story: Story): Promise<File[]> {
  const files: File[] = [];
  const limit = Math.min(10, story.slides.length); // iOS не любит много файлов

  for (let i = 0; i < limit; i++) {
    const canvas = await renderSlideToCanvas(story, i);
    const blob = await canvasToPngBlob(canvas);
    if (!blob || blob.size === 0) log(`slide #${i + 1}: empty blob`, blob);
    files.push(
      new File([blob], `slide-${String(i + 1).padStart(2, '0')}.png`, {
        type: 'image/png',
      })
    );
  }
  return files;
}

/** Пытаемся открыть системный share-sheet; иначе — скачиваем PNG по одному */
export async function shareSlides(story: Story): Promise<void> {
  const files = await exportSlidesAsFiles(story);
  const nav: any = navigator;

  // Диагностика перед вызовом
  log('candidates:', files.map((f, i) => ({ i, name: f.name, type: f.type, size: f.size })));
  log('support:', { hasShare: !!nav?.share, hasCanShare: !!nav?.canShare, filesCount: files.length });

  let can = false;
  if (nav?.canShare) {
    try {
      can = nav.canShare({ files });
    } catch (e) {
      log('canShare threw:', e);
    }
  }
  log('canShare({files}) =', can);

  if (files.length && nav?.share && can) {
    try {
      await nav.share({ files, title: 'Carousel' }); // без text/url — так стабильнее в Safari
      log('share(): OK');
      return;
    } catch (e) {
      log('share() error:', e);
    }
  }

  // Фолбэк — скачивание по одному (без ZIP)
  log('fallback: download one-by-one');
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

