import type { Slide, LayoutOptions, Theme } from '../types';
import { PADDING } from './constants';

function drawGradient(ctx: CanvasRenderingContext2D, w: number, h: number, position: 'top' | 'bottom') {
  const gh = Math.round(h * 0.28);
  const g = position === 'top'
    ? ctx.createLinearGradient(0, 0, 0, gh)
    : ctx.createLinearGradient(0, h - gh, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  if (position === 'top') ctx.fillRect(0, 0, w, gh); else ctx.fillRect(0, h - gh, w, gh);
}

function drawUsername(ctx: CanvasRenderingContext2D, handle: string, w: number, h: number) {
  ctx.font = '600 38px SF Pro Display, Inter, system-ui, -apple-system';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textBaseline = 'bottom';
  ctx.fillText(handle, PADDING, h - PADDING);
}

function drawPager(ctx: CanvasRenderingContext2D, w: number, h: number, idx: number, total: number, showArrow: boolean) {
  ctx.font = '500 32px SF Pro Display, Inter, system-ui, -apple-system';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'right';
  const text = `${idx}/${total}${showArrow ? ' →' : ''}`;
  ctx.fillText(text, w - PADDING, h - PADDING);
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

export async function renderSlideToCanvas(
  slide: Slide,
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    height: number;
    theme: Theme;
    layout: LayoutOptions;
    username: string;
    page?: { index: number; total: number; showArrow: boolean };
  }
) {
  const { width, height, theme, layout, username, page } = opts;
  ctx.clearRect(0, 0, width, height);

  if (slide.image) {
    const img = new Image();
    img.src = slide.image;
    await new Promise(res => {
      if (img.complete) res(null);
      else { img.onload = () => res(null); img.onerror = () => res(null); }
    });
    const r = Math.max(width / img.width, height / img.height);
    const dw = Math.round(img.width * r);
    const dh = Math.round(img.height * r);
    ctx.drawImage(img, Math.round((width - dw) / 2), Math.round((height - dh) / 2), dw, dh);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
  }

  if (theme === 'light') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, 0, width, height);
  } else if (theme === 'dark') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, width, height);
  } else {
    drawGradient(ctx, width, height, layout.textPosition);
  }

  ctx.fillStyle = layout.color || '#fff';
  ctx.font = `400 ${layout.textSize}px SF Pro Display, Inter, system-ui, -apple-system`;
  const box = {
    x: PADDING,
    y: layout.textPosition === 'bottom' ? height - Math.round(height * 0.28) + PADDING : PADDING,
    w: width - PADDING * 2,
    yMax: height - PADDING - 56,
  };
  ctx.save();
  typesetWithinBox(ctx, slide.body || '', box, layout.lineHeight, layout.textSize);
  ctx.restore();

  drawUsername(ctx, '@' + username.replace(/^@/, ''), width, height);
  if (page) {
    drawPager(ctx, width, height, page.index, page.total, page.showArrow);
  }
}
