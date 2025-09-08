import { renderSlide, SlideRenderModel } from "./render";

function ensureImageLoaded(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej();
  });
}

export async function exportAll(slides: SlideRenderModel[]){
  const cnv = document.createElement("canvas");
  cnv.width = 1080; cnv.height = 1350;
  const ctx = cnv.getContext("2d")!;
  const blobs: Blob[] = [];
  for (const s of slides){
    await ensureImageLoaded(s.img);
    renderSlide(ctx, { ...s, w:cnv.width, h:cnv.height });
    const blob = await new Promise<Blob>(res=> cnv.toBlob(b=>res(b!), "image/jpeg", 0.95));
    blobs.push(blob);
  }
  return blobs; // дальше уже сохраняем
}
