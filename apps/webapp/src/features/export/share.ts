import { Slide } from '@/state/store';
import { renderSlideToPNG } from '../render/canvas';
import { getExportSlides } from '@/utils/getExportSlides';

export async function shareAllSlides(slides: Slide[]) {
  const slidesForRender = getExportSlides(slides ?? []);
  if (slidesForRender.length === 0) { alert('Добавьте текст или фото.'); return; }

  // Рендерим PNG
  const blobs: Blob[] = [];
  for (const s of slidesForRender) blobs.push(await renderSlideToPNG(s));

  // Пытаемся через Web Share API (iOS 16+)
  const files = blobs.map((b,i)=> new File([b], `slide-${String(i+1).padStart(2,'0')}.png`, { type: 'image/png' }));
  if (navigator.canShare?.({ files })) {
    await navigator.share({ files });
    return;
  }

  // Фолбэк — скачать по одному
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url; a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
}
