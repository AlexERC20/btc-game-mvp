import { renderSlideToCanvas, CarouselSettings } from './render';
import type { Slide } from '../types';
import { useStore } from '../state/store';

export type ExportOptions = {
  format: 'jpg' | 'png';
  quality?: number;
  range: 'all' | 'current';
  size: { width: number; height: number };
  onProgress?: (index: number, total: number) => void;
  onFallback?: (url: string) => void;
};

export async function exportSlides(
  slides: Slide[],
  options: ExportOptions,
  currentIndex = 0
): Promise<void> {
  const { format, quality = 0.8, range, size, onProgress, onFallback } = options;
  const { defaults, frame } = useStore.getState();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;
  const targets = range === 'current' ? [slides[currentIndex]].filter(Boolean) : slides;
  const names = targets.map((_, i) => `carousel-${i + 1}.${format}`);
  const blobs: Blob[] = [];
  for (let i = 0; i < targets.length; i++) {
    const slide = targets[i];
    await renderSlideToCanvas(slide as any, ctx, {
      frame: { ...frame, width: size.width, height: size.height },
      theme: 'photo',
      defaults,
      username: 'user',
      page:
        range === 'all'
          ? { index: i + 1, total: targets.length, showArrow: i + 1 < targets.length }
          : undefined,
      settings: {
        fontFamily: 'Inter',
        fontWeight: 600,
        fontItalic: false,
        fontApplyHeading: true,
        fontApplyBody: true,
        overlayEnabled: false,
        overlayHeight: 0.3,
        overlayOpacity: 0.3,
        headingEnabled: false,
        headingColor: '#ffffff',
        textSize: 0,
        lineHeight: defaults.lineHeight,
        textPosition: defaults.textPosition,
        template: 'photo',
        quoteMode: false,
      } as CarouselSettings,
    });
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        format === 'jpg' ? 'image/jpeg' : 'image/png',
        format === 'jpg' ? quality : undefined,
      );
    });
    blobs.push(blob);
    onProgress?.(i + 1, targets.length);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await delay(50);
  }
  const files = blobs.map((b, i) => new File([b], names[i], { type: b.type }));
  let success = false;
  try {
    if (navigator.canShare?.({ files })) {
      await (navigator as any).share({ files, title: 'Carousel' });
      success = true;
    }
  } catch (err) {
    console.warn('share failed', err);
  }
  if (!success) {
    try {
      for (let i = 0; i < files.length; i++) {
        const url = URL.createObjectURL(files[i]);
        const a = document.createElement('a');
        a.href = url;
        a.download = names[i];
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        await delay(250);
      }
      success = true;
    } catch (err) {
      console.warn('download failed', err);
    }
  }
  if (!success && blobs[0]) {
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => rej(reader.error);
        reader.readAsDataURL(blobs[0]);
      });
      onFallback?.(dataUrl);
    } catch (err) {
      console.error('fallback failed', err);
    }
  }
}

export async function shareOrDownloadAll(blobs: Blob[]) {
  const files = blobs.map((b, i) => new File([b], `slide_${String(i+1).padStart(2,'0')}.jpg`, { type: 'image/jpeg' }))

  // 1) Лучшее: системный шэр (iOS/Android)
  if ((navigator as any).canShare && (navigator as any).canShare({ files })) {
    await (navigator as any).share({ files, title: 'Carousel' }).catch(()=>{})
    return
  }

  // 2) Открыть каждый файл во вкладке (топ для iOS Telegram)
  const isIosTg = /(iphone|ipad)/i.test(navigator.userAgent) && !!(window as any).Telegram?.WebApp
  if (isIosTg) {
    for (const f of files) {
      const url = URL.createObjectURL(f)
      window.open(url, '_blank')  // «Открыть» -> «Сохранить»
      await delay(200)
      URL.revokeObjectURL(url)
    }
    return
  }

  // 3) Стандартное скачивание якорем (Android/десктоп)
  for (const f of files) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f)
    a.download = f.name
    document.body.appendChild(a); a.click(); a.remove()
    await delay(120)
    URL.revokeObjectURL(a.href)
  }
}

export async function downloadOne(blob: Blob, name='slide.jpg') {
  const file = new File([blob], name, { type: 'image/jpeg' })

  if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
    await (navigator as any).share({ files: [file], title: name }).catch(()=>{})
    return
  }
  const url = URL.createObjectURL(file)
  const isIosTg = /(iphone|ipad)/i.test(navigator.userAgent) && !!(window as any).Telegram?.WebApp
  if (isIosTg) { window.open(url, '_blank'); await delay(200); URL.revokeObjectURL(url); return }
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

function delay(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
