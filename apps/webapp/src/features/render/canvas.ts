import { Slide } from '@/state/store';

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;

function drawCover(ctx:CanvasRenderingContext2D, img: HTMLImageElement){
  const cw = CANVAS_W, ch = CANVAS_H;
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = cw / ch;
  let w=0,h=0,x=0,y=0;
  if (ir > cr) { // слишком широкий
    h = ch; w = h * ir; x = (cw - w)/2; y = 0;
  } else {
    w = cw; h = w / ir; x = 0; y = (ch - h)/2;
  }
  ctx.drawImage(img, x, y, w, h);
}

export async function renderSlideToPNG(slide: Slide): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W; canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

  if (slide.image) {
    await new Promise<void>((res, rej)=>{
      const img = new Image();
      img.onload = ()=>{ drawCover(ctx, img); res(); };
      img.onerror = rej;
      img.crossOrigin = 'anonymous';
      img.src = slide.image!;
    });
  }

  if (slide.body) {
    ctx.font = '48px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 12;
    const lines = wrap(slide.body, 28);
    let y = CANVAS_H - 80 - lines.length * 56;
    lines.forEach(l => { ctx.fillText(l, 64, y); y += 56; });
  }

  if (slide.nickname) {
    ctx.font = '32px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 8;
    ctx.fillText(slide.nickname, 64, CANVAS_H - 32);
  }

  return await new Promise<Blob>((resolve, reject)=>{
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')),'image/png');
  });
}

function wrap(text:string, max:number){
  const w = text.split(/\s+/); const out:string[] = [];
  let cur:string[] = [];
  w.forEach(word=>{
    if ((cur.join(' ').length + word.length + 1) <= max) cur.push(word);
    else { out.push(cur.join(' ')); cur=[word]; }
  });
  if (cur.length) out.push(cur.join(' '));
  return out.slice(0, 10);
}
