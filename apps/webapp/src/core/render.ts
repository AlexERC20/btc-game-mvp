import type { Slide, Defaults, Theme } from '../types';
import { PADDING } from './constants';
import type { FrameSpec } from '../state/store';
import { computeLayout } from './textLayout';

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

export async function renderSlideToCanvas(
  slide: Slide,
  ctx: CanvasRenderingContext2D,
  opts: {
    frame: FrameSpec;
    theme: Theme;
    defaults: Defaults;
    username: string;
    page?: { index: number; total: number; showArrow: boolean };
  }
) {
  const { frame, theme, defaults, username, page } = opts;
  const width = frame.width;
  const height = frame.height;
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

  const effFontSize = slide.overrides?.fontSize ?? defaults.fontSize;
  const effLH = slide.overrides?.lineHeight ?? defaults.lineHeight;
  const effPos = slide.overrides?.textPosition ?? defaults.textPosition;
  const titleColor = (slide.overrides?.matchTitleToBody ?? defaults.matchTitleToBody)
    ? defaults.bodyColor
    : (slide.overrides?.titleColor ?? defaults.titleColor);

  if (theme === 'light') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, 0, width, height);
  } else if (theme === 'dark') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, width, height);
  } else {
    drawGradient(ctx, width, height, effPos);
  }

  const layout = await computeLayout({
    frame,
    fontFamily: 'SF Pro Display, Inter, system-ui, -apple-system',
    fontSize: effFontSize,
    lineHeight: effLH,
    position: effPos,
    title: slide.title?.trim() || undefined,
    body: slide.body || '',
  });

  ctx.font = `${effFontSize}px SF Pro Display, Inter, system-ui, -apple-system`;
  ctx.textBaseline = 'top';

  if (layout.title) {
    ctx.fillStyle = titleColor;
    layout.title.lines.forEach((line, i) => {
      ctx.fillText(
        line,
        layout.title!.box.x,
        layout.title!.box.y + i * Math.round(effFontSize * effLH)
      );
    });
  }

  ctx.fillStyle = defaults.bodyColor;
  layout.body.lines.forEach((line, i) => {
    ctx.fillText(
      line,
      layout.body.box.x,
      layout.body.box.y + i * Math.round(effFontSize * effLH)
    );
  });

  drawUsername(ctx, '@' + username.replace(/^@/, ''), width, height);
  if (page) {
    drawPager(ctx, width, height, page.index, page.total, page.showArrow);
  }
}
