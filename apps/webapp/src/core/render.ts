export type RenderOptions = {
  w: number; h: number;
  img: HTMLImageElement;
  template: "photo" | "light" | "dark";
  text: {
    heading?: string;
    body?: string;
    align: "top" | "bottom";
    color: string;
    headingMatchesBody: boolean;
    fontSize: number;        // px при базовой ширине 1080
    lineHeight: number;      // множитель, напр. 1.25
    hyphenate?: boolean;
  };
  username: string;          // без @ — добавим сами
  page: { index: number; total: number; showArrow: boolean };
};

export type SlideRenderModel = Omit<RenderOptions, "w" | "h">;

const BASE_W = 1080;                 // 4:5 как в инсте фиде

const scale = (w:number, v:number)=> Math.round(v*w/BASE_W);

export function renderSlide(ctx: CanvasRenderingContext2D, o: RenderOptions) {
  const { w, h } = o;

  // 0) Очистка без чёрной заливки
  ctx.clearRect(0, 0, w, h);

  // 1) Фон/фото
  ctx.save();
  if (o.template === "photo") {
    // Кадрирование по cover
    const r = Math.max(w/o.img.width, h/o.img.height);
    const dw = Math.round(o.img.width*r);
    const dh = Math.round(o.img.height*r);
    ctx.drawImage(o.img, Math.round((w-dw)/2), Math.round((h-dh)/2), dw, dh);
  } else {
    ctx.fillStyle = o.template === "dark" ? "#0b0b0b" : "#f5f5f7";
    ctx.fillRect(0,0,w,h);
    const r = Math.max(w/o.img.width, h/o.img.height);
    const dw = Math.round(o.img.width*r);
    const dh = Math.round(o.img.height*r);
    ctx.globalAlpha = 0.12;
    ctx.drawImage(o.img, Math.round((w-dw)/2), Math.round((h-dh)/2), dw, dh);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 2) Паддинги и безопасная зона под ник
  const pad = scale(w, 48);
  const nameFs = scale(w, 36);
  const bottomSafe = Math.ceil(nameFs*1.6) + pad; // высота ника + запас

  // 3) Текст
  const textColor = o.text.color;
  ctx.fillStyle = textColor;
  ctx.textBaseline = "alphabetic";

  const bodyFs = scale(w, o.text.fontSize);
  const lh = o.text.lineHeight;

  // Заголовок: цвет как у текста если включено
  if (o.text.heading) {
    ctx.font = `600 ${Math.round(bodyFs*1.05)}px Inter, system-ui, -apple-system`;
  } else {
    ctx.font = `${bodyFs}px Inter, system-ui, -apple-system`;
  }

  const maxWidth = w - pad*2;
  const topY = pad;
  const bottomLimit = h - bottomSafe; // ВАЖНО: не залезать на ник

  const lines: string[] = layoutParagraph(
    ctx, `${o.text.heading ? o.text.heading+"\n" : ""}${o.text.body ?? ""}`,
    maxWidth, Math.round(bodyFs*lh)
  );

  const blockHeight = lines.length * Math.round(bodyFs*lh);
  let startY = o.text.align === "bottom"
    ? Math.max(topY, bottomLimit - blockHeight)
    : Math.min(topY + blockHeight, bottomLimit) - blockHeight;

  for (const line of lines) {
    ctx.fillText(line, pad, startY);
    startY += Math.round(bodyFs*lh);
    if (startY > bottomLimit) break;  // safety
  }

  // 4) Ник (всегда поверх и в одном месте)
  drawUsername(ctx, `@${o.username}`, pad, h - pad, nameFs);

  // 5) Номер слайда и стрелка
  drawPager(ctx, o.page.index, o.page.total, w - pad, h - pad, nameFs, o.page.showArrow);
}

export async function renderSlideBlob(o: RenderOptions): Promise<Blob> {
  const cnv = document.createElement('canvas');
  cnv.width = o.w; cnv.height = o.h;
  const ctx = cnv.getContext('2d')!;
  renderSlide(ctx, o);
  return await new Promise<Blob>(res => cnv.toBlob(b=>res(b!), 'image/jpeg', 0.95)!);
}

function layoutParagraph(ctx: CanvasRenderingContext2D, text: string, maxW: number, lineStep: number){
  const words = text.replace(/\r/g,"").split(/\s+/);
  const lines:string[] = [];
  let cur = "";
  for (const w of words){
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawUsername(ctx:CanvasRenderingContext2D, s:string, x:number, y:number, fs:number){
  ctx.save();
  ctx.font = `500 ${fs}px Inter, system-ui, -apple-system`;
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = Math.round(fs*0.4);
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "white";
  ctx.fillText(s, x, y);
  ctx.restore();
}
function drawPager(ctx:CanvasRenderingContext2D, i:number, total:number, x:number, y:number, fs:number, arrow:boolean){
  ctx.save();
  ctx.font = `500 ${Math.round(fs*0.9)}px Inter, system-ui, -apple-system`;
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.textAlign = "right";
  ctx.fillText(`${i}/${total}${arrow ? " →" : ""}`, x, y);
  ctx.restore();
}
