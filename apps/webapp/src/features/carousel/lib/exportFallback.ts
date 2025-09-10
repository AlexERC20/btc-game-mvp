import { renderSlideToCanvas } from '../../../core/render';

export async function renderSlidesFallback(slides: any[], opts: any) {
  const canvas = document.createElement('canvas');
  canvas.width = opts.w;
  canvas.height = opts.h;
  const ctx = canvas.getContext('2d')!;
  const blobs: Blob[] = [];
  for (let i = 0; i < slides.length; i++) {
    await renderSlideToCanvas(slides[i], ctx, opts);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej('toBlob failed')), 'image/jpeg', 0.92)
    );
    blobs.push(blob);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = canvas.width;
  }
  return blobs;
}
