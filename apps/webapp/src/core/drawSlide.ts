import { CANVAS_W, CANVAS_H, PADDING, USERNAME_OFFSET_Y, BOTTOM_GRADIENT_HEIGHT, BODY_FONT, LINE_HEIGHT } from './constants';

export type SlideRenderModel = {
  img: HTMLImageElement;
  template: 'photo' | 'light' | 'dark';
  text: {
    body: string;
    align: 'top' | 'bottom';
    color: string;
    fontSize: number;
  };
  username: string;
  page: { index: number; total: number; showArrow: boolean };
};

function drawBottomGradient(ctx: CanvasRenderingContext2D) {
  const h = BOTTOM_GRADIENT_HEIGHT;
  const y0 = CANVAS_H - h;
  const g = ctx.createLinearGradient(0, y0, 0, CANVAS_H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, CANVAS_W, h);
}

function drawUsername(ctx: CanvasRenderingContext2D, handle: string) {
  ctx.font = '600 38px SF Pro Display, Inter, system-ui, -apple-system';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textBaseline = 'bottom';
  ctx.fillText(handle, PADDING, CANVAS_H - PADDING);
}

function drawPager(ctx: CanvasRenderingContext2D, idx: number, total: number, showArrow: boolean) {
  ctx.font = '500 32px SF Pro Display, Inter, system-ui, -apple-system';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'right';
  const text = `${idx}/${total}${showArrow ? ' →' : ''}`;
  ctx.fillText(text, CANVAS_W - PADDING, CANVAS_H - PADDING);
}

function typesetWithinBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: { x: number; y: number; w: number; yMax: number },
  lineHeight: number,
  fontSize: number
) {
  const words = text.replace(/\r/g, '').split(/\s+/);
  const lines: string[] = [];
  let current = '';
  const lineStep = Math.round(fontSize * lineHeight);
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (ctx.measureText(test).width <= box.w) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);

  let y = box.y + fontSize;
  for (const line of lines) {
    if (y > box.yMax) break;
    ctx.fillText(line, box.x, y);
    y += lineStep;
  }
}

export function drawSlide(ctx: CanvasRenderingContext2D, m: SlideRenderModel) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // background image
  const r = Math.max(CANVAS_W / m.img.width, CANVAS_H / m.img.height);
  const dw = Math.round(m.img.width * r);
  const dh = Math.round(m.img.height * r);
  ctx.drawImage(m.img, Math.round((CANVAS_W - dw) / 2), Math.round((CANVAS_H - dh) / 2), dw, dh);

  if (m.template === 'light') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else if (m.template === 'dark') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else {
    drawBottomGradient(ctx);
  }

  // text
  ctx.fillStyle = m.text.color;
  let fs = m.text.fontSize;
  while (fs >= 36) {
    ctx.font = `400 ${fs}px SF Pro Display, Inter, system-ui, -apple-system`;
    const box = {
      x: PADDING,
      y: m.text.align === 'bottom' ? CANVAS_H - BOTTOM_GRADIENT_HEIGHT + PADDING : PADDING,
      w: CANVAS_W - PADDING * 2,
      yMax: CANVAS_H - PADDING - USERNAME_OFFSET_Y - 48,
    };
    ctx.save();
    typesetWithinBox(ctx, m.text.body, box, LINE_HEIGHT, fs);
    ctx.restore();
    break;
  }

  drawUsername(ctx, '@' + m.username.replace(/^@/, ''));
  drawPager(ctx, m.page.index, m.page.total, m.page.showArrow);
}
