import { renderSlideToCanvas } from '../core/render';

self.onmessage = async (e: MessageEvent) => {
  const { slide, opts } = e.data;
  if (typeof OffscreenCanvas === 'undefined') {
    (self as any).postMessage({ type: 'fallback' });
    return;
  }
  const canvas = new OffscreenCanvas(opts.w, opts.h);
  const ctx = canvas.getContext('2d')!;
  await renderSlideToCanvas(slide, ctx as any, opts);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  (self as any).postMessage({ type: 'done', blob }, [blob]);
};
export {};
