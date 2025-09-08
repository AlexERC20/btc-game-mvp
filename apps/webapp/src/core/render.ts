import type { Slide, Defaults, Theme } from '../types';
import type { FrameSpec } from '../state/store';

const BASE_FAMILY = '"SF Pro Display","Inter",system-ui,-apple-system,Segoe UI,Roboto,Arial';

type CarouselSettings = {
  fontFamily: 'Inter'|'Manrope'|'SF Pro'|'Montserrat';
  fontWeight: number;
  fontItalic: boolean;
  fontApplyHeading: boolean;
  fontApplyBody: boolean;
  overlayEnabled: boolean;
  overlayHeightPct: number;
  overlayOpacityPct: number;
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = (text || '').split(/\n+/);
  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawUsername(
  ctx: CanvasRenderingContext2D,
  handle: string,
  w: number,
  h: number,
  padding: number,
  style: string,
  family: string,
  weight: number,
) {
  ctx.font = `${style} ${weight} 38px "${family.replaceAll('"','\\"')}"`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(handle, padding, h - padding);
}

function drawPager(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  padding: number,
  idx: number,
  total: number,
  showArrow: boolean,
) {
  ctx.font = '500 32px SF Pro Display, Inter, system-ui, -apple-system';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const text = `${idx}/${total}${showArrow ? ' →' : ''}`;
  ctx.fillText(text, w - padding, h - padding);
  ctx.textAlign = 'left';
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
    settings: CarouselSettings;
  }
) {
  const { frame, theme, defaults, username, page, settings } = opts;
  const width = frame.width;
  const height = frame.height;
  const pixelRatio = (frame as any).pixelRatio ?? 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.strokeStyle = 'transparent';
  ctx.lineWidth = 0;
  if (pixelRatio !== 1) ctx.scale(pixelRatio, pixelRatio);

  if (slide.image) {
    const img = new Image();
    img.src = slide.image;
    try { await img.decode(); } catch { /* ignore */ }
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
  }

  const lineHeight = slide.overrides?.lineHeight ?? defaults.lineHeight;
  const textColor = defaults.bodyColor;
  const fontSize = Math.round(width * 0.045);
  const lineHeightPx = Math.round(fontSize * lineHeight);
  const PADDING = Math.round(width * 0.06);
  const BOTTOM = Math.round(height * 0.11);
  const TEXT_BOX_LEFT = PADDING;
  const TEXT_BOX_WIDTH = width - PADDING - PADDING;

  const family = settings.fontFamily === 'SF Pro'
    ? '-apple-system, BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI",Roboto,Inter,"Helvetica Neue",Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji",sans-serif'
    : settings.fontFamily;
  const style = settings.fontItalic ? 'italic' : 'normal';
  const weight = settings.fontWeight || 600;
  const bodyFamily = settings.fontApplyBody ? family : BASE_FAMILY;
  const headingFamily = settings.fontApplyHeading ? family : BASE_FAMILY;
  const bodyWeight = settings.fontApplyBody ? weight : 400;
  const headingWeight = settings.fontApplyHeading ? weight : 400;

  const basePx = Math.max(fontSize, 38);
  await (document as any).fonts.load(`${style} ${Math.round(basePx)}px ${family}`);

  ctx.font = `${style} ${bodyWeight} ${fontSize}px "${bodyFamily.replaceAll('"','\\"')}"`;
  ctx.fillStyle = textColor;

  if (settings.overlayEnabled) {
    const h = height * (settings.overlayHeightPct / 100);
    const g = ctx.createLinearGradient(0, height - h, 0, height);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${settings.overlayOpacityPct/100})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, height - h, width, h);
    ctx.fillStyle = textColor;
  }

  const slideText = slide.body || '';
  const lines = wrapText(ctx, slideText, TEXT_BOX_WIDTH);
  let y = (height - BOTTOM) - (lines.length - 1) * lineHeightPx;
  for (const line of lines) {
    ctx.fillText(line, TEXT_BOX_LEFT, y);
    y += lineHeightPx;
  }

  drawUsername(ctx, '@' + username.replace(/^@/, ''), width, height, PADDING, style, headingFamily, headingWeight);
  if (page) {
    drawPager(ctx, width, height, PADDING, page.index, page.total, page.showArrow);
  }
}
