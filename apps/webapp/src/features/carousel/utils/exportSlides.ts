import domtoimage from 'dom-to-image-more';
import { shareOrDownloadAll, downloadOne } from '../../../core/export';

interface Options {
  containerSelector: string;
  hideSelectors?: string[];
  format?: 'png' | 'jpeg';
  quality?: number;
  indices?: number[]; // which slides to export, undefined = all
  onProgress?: (i: number, total: number) => void;
}

async function waitAssetsReady(container: HTMLElement) {
  const imgs = Array.from(container.querySelectorAll('img'));
  const imgPromises = imgs.map(img => {
    img.crossOrigin = 'anonymous';
    const clone = new Image();
    clone.crossOrigin = 'anonymous';
    clone.src = img.currentSrc || img.src;
    return clone.decode().catch(() => {});
  });
  await Promise.all(imgPromises);
  await (document as any).fonts?.ready?.catch(() => {});
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality);
  });
}

export async function exportSlides({
  containerSelector,
  hideSelectors = [],
  format = 'jpeg',
  quality = 0.92,
  indices,
  onProgress,
}: Options) {
  const container = document.querySelector<HTMLElement>(containerSelector);
  if (!container) throw new Error('Container not found');
  const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-export-card]'));
  const targets = indices ? indices.map(i => cards[i]).filter(Boolean) : cards;

  await waitAssetsReady(container);

  const hidden: HTMLElement[] = [];
  hideSelectors.forEach(sel => {
    document.querySelectorAll<HTMLElement>(sel).forEach(el => {
      (el as any).dataset._prevVisibility = el.style.visibility || '';
      el.style.visibility = 'hidden';
      hidden.push(el);
    });
  });

  const blobs: Blob[] = [];
  for (let i = 0; i < targets.length; i++) {
    const cardEl = targets[i];
    const canvas = await domtoimage.toCanvas(cardEl, {
      quality,
      bgcolor: 'transparent',
      style: { transform: 'none' },
    });
    const blob = await canvasToBlob(canvas, `image/${format}`, quality);
    blobs.push(blob);
    if (onProgress) onProgress(i + 1, targets.length);
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = canvas.width;
  }

  hidden.forEach(el => {
    el.style.visibility = (el as any).dataset._prevVisibility || '';
    delete (el as any).dataset._prevVisibility;
  });

  if (blobs.length === 1) {
    await downloadOne(blobs[0]);
  } else if (blobs.length > 1) {
    await shareOrDownloadAll(blobs);
  }
}
