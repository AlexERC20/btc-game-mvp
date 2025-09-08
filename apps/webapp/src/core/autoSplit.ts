export type BaseParams = {
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
  padding: number;
};

export function splitToSlides(input: string, renderParams: BaseParams): string[] {
  const parts = input.split(/\n\s*Слайд\s+\d+[^\n]*\n/i).filter(Boolean);
  if (parts.length > 1) return parts.map(s => s.trim());

  // авто: режем по вместимости
  const paragraphs = input.split(/\n{2,}/).map(s=>s.trim());
  const slides: string[] = [];
  let cur = "";
  for (const p of paragraphs){
    const candidate = cur ? cur+"\n\n"+p : p;
    if (fits(candidate, renderParams)) {
      cur = candidate;
    } else {
      if (cur) slides.push(cur);
      cur = p;
    }
  }
  if (cur) slides.push(cur);
  return slides;
}

function fits(text: string, renderParams: BaseParams): boolean {
  const cnv = document.createElement('canvas');
  cnv.width = renderParams.width; cnv.height = renderParams.height;
  const ctx = cnv.getContext('2d')!;
  const pad = renderParams.padding;
  const nameFs = 36; // base 1080
  const bottomSafe = Math.ceil(nameFs*1.6) + pad;
  const bodyFs = renderParams.fontSize;
  const lh = renderParams.lineHeight;
  ctx.font = `${bodyFs}px Inter, system-ui, -apple-system`;
  const maxWidth = renderParams.width - pad*2;
  const lines = layoutParagraph(ctx, text, maxWidth);
  const lineH = Math.round(bodyFs*lh);
  const blockHeight = lines.length * lineH;
  return blockHeight <= renderParams.height - pad - bottomSafe;
}

function layoutParagraph(ctx: CanvasRenderingContext2D, text: string, maxW: number){
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
