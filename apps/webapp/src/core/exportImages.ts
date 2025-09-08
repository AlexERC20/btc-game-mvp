import { drawSlide, SlideRenderModel } from "./drawSlide";
import { CANVAS_W, CANVAS_H } from "./constants";

function ensureImageLoaded(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej();
  });
}

export async function exportAll(slides: SlideRenderModel[]){
  const cnv = document.createElement("canvas");
  cnv.width = CANVAS_W; cnv.height = CANVAS_H;
  const ctx = cnv.getContext("2d")!;
  const blobs: Blob[] = [];
  for (const s of slides){
    await ensureImageLoaded(s.img);
    drawSlide(ctx, s);
    const blob = await new Promise<Blob>(res=> cnv.toBlob(b=>res(b!), "image/jpeg", 0.95));
    blobs.push(blob);
  }
  return blobs; // дальше уже сохраняем
}
