import { renderSlideToCanvas } from '@/features/carousel/lib/canvasRender';
import type { Story } from '@/core/story';

// [DEBUG] единый логер
const __log = (...a: any[]) => console.info('[share]', ...a);

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob|null>(res =>
    canvas.toBlob(b => res(b), 'image/png', 0.92)
  );
  if (blob) return blob;

  // iOS иногда даёт null → безопасный фолбэк
  __log('toBlob(null) → fallback toDataURL'); // [DEBUG]
  const dataUrl = canvas.toDataURL('image/png');
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

export async function exportSlidesAsFiles(story: Story): Promise<File[]> {
  const files: File[] = [];
  const limit = Math.min(10, story.slides.length); // лимит для Instagram/iOS
  for (let i = 0; i < limit; i++) {
    const canvas = await renderSlideToCanvas(story, i);
    const blob = await canvasToPngBlob(canvas);
    // [DEBUG]
    if (!blob || blob.size === 0) __log(`slide #${i + 1}: toBlob(null) — таинт/шрифт не прогрузился?`);
    files.push(new File([blob], `slide-${String(i + 1).padStart(2, '0')}.png`, { type: 'image/png' }));
    // даём браузеру «вздохнуть», чтобы не потерять user-gesture
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 0));
  }
  // [DEBUG]
  __log('candidates:', files.map((f, i) => ({ i, name: f.name, type: f.type, size: f.size })));

  return files;
}

export async function shareSlides(story: Story): Promise<void> {
  const files = await exportSlidesAsFiles(story);
  const nav: any = navigator;

  // [DEBUG] сводка окружения
  __log('support:', {
    hasShare: !!nav?.share,
    hasCanShare: !!nav?.canShare,
    filesCount: files.length,
  });

  let can = false;
  if (nav?.canShare) {
    try { can = nav.canShare({ files }); }
    catch (e) { __log('canShare threw:', e); } // [DEBUG]
  }
  __log('canShare({files}) =', can); // [DEBUG]

  const isTelegram = /Telegram/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!nav?.share && isTelegram && isIOS) {
    alert('Встроенный браузер Telegram блокирует сохранение. Нажмите ••• и выберите "Open in Safari", затем снова Share.');
  }

  // В Safari стабильнее передавать ТОЛЬКО files (+title)
  if (files.length && nav?.share && can) {
    try {
      await nav.share({ files, title: 'Carousel' });
      __log('share(): OK');
      return;
    } catch (e) {
      __log('share() error:', e);
    }
  }

  // Фолбэк: последовательное скачивание PNG (если WebView блокирует — см. пункт 4)
  __log('fallback: download one-by-one'); // [DEBUG]
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    __log('downloaded', f.name, f.size); // [DEBUG]
    // маленькая пауза между файлами
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 120));
  }

  if (!files.length) __log('no files to share'); // [DEBUG]
}

