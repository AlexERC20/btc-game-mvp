import type { Slide, Defaults, Theme } from '../types';
import type { FrameSpec } from '../state/store';
import { CANVAS_PRESETS } from './constants';

const BASE_FAMILY = '"SF Pro Display","Inter",system-ui,-apple-system,Segoe UI,Roboto,Arial';

export type CarouselSettings = {
  fontFamily: 'Inter'|'Manrope'|'SF Pro'|'Montserrat';
  fontWeight: number;
  fontItalic: boolean;
  fontApplyHeading: boolean;
  fontApplyBody: boolean;
  overlayEnabled: boolean;
  overlayHeight: number;    // 0.10..0.50 fraction
  overlayOpacity: number;   // 0.10..0.50 fraction
  headingEnabled: boolean;
  headingColor: string;
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

export function measureTextBlocks(
  text: string,
  style: { fontFamily: string; fontSize: number; lineHeight: number; fontStyle?: string; fontWeight?: number },
  box: { width: number; height: number }
) {
  const ctx = document.createElement('canvas').getContext('2d')!;
  const fontStyle = style.fontStyle || 'normal';
  const fontWeight = style.fontWeight || 400;
  ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize}px "${style.fontFamily.replaceAll('"','\\"')}"`;
  const lines = wrapText(ctx, text, box.width);
  const lineHeightPx = Math.round(style.fontSize * style.lineHeight);
  const fits = lines.length * lineHeightPx <= box.height;
  return { lines, fits };
}

export function splitTextToSlides(
  text: string,
  style: { fontFamily: string; fontSize: number; lineHeight: number; fontStyle?: string; fontWeight?: number },
  box: { width: number; height: number }
) {
  const manual = text.split(/\n\n+/).map(t => t.trim()).filter(Boolean);
  const segments = manual.length > 1 ? manual : [text.trim()];
  const result: string[] = [];

  const pushSegment = (seg: string) => {
    const sentences = seg.split(/(?<=[.!?])\s+/).filter(Boolean);
    let cur = '';
    for (const s of sentences) {
      const test = cur ? cur + ' ' + s : s;
      if (!measureTextBlocks(test, style, box).fits && cur) {
        result.push(cur.trim());
        cur = s;
      } else {
        cur = test;
      }
    }
    if (cur) result.push(cur.trim());
  };

  for (const seg of segments) pushSegment(seg);

  const final: string[] = [];
  for (const part of result) {
    if (measureTextBlocks(part, style, box).fits) {
      final.push(part.trim());
      continue;
    }
    const words = part.split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (!measureTextBlocks(test, style, box).fits && cur) {
        final.push(cur.trim());
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) final.push(cur.trim());
  }
  return final;
}

function splitHeading(body: string) {
  const hardBreak = body.indexOf('\n\n');
  if (hardBreak >= 0) return [body.slice(0, hardBreak), body.slice(hardBreak + 2)];
  const m = body.match(/([^.?!\n]+[.?!]?)([\s\S]*)/);
  return m ? [m[1].trim(), m[2].trim()] : [body, ''];
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
    const h = Math.round(settings.overlayHeight * height);
    if (h > 0) {
      const grad = ctx.createLinearGradient(0, height, 0, height - h);
      const [r,g,b] = theme === 'dark' ? [0,0,0] : [255,255,255];
      grad.addColorStop(0, `rgba(${r},${g},${b},${settings.overlayOpacity})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, height - h, width, h);
      ctx.fillStyle = textColor;
    }
  }

  let slideText = slide.body || '';
  let heading = '';
  if (settings.headingEnabled) {
    const parts = splitHeading(slideText);
    heading = parts[0];
    slideText = parts[1];
  }
  const headingLines = settings.headingEnabled && heading ? wrapText(ctx, heading, TEXT_BOX_WIDTH) : [];
  const bodyLines = wrapText(ctx, slideText, TEXT_BOX_WIDTH);
  let y = (height - BOTTOM) - (headingLines.length + bodyLines.length - 1) * lineHeightPx;
  if (settings.headingEnabled && headingLines.length) {
    ctx.font = `${style} ${headingWeight} ${fontSize}px "${headingFamily.replaceAll('"','\\"')}"`;
    ctx.fillStyle = settings.headingColor;
    for (const line of headingLines) { ctx.fillText(line, TEXT_BOX_LEFT, y); y += lineHeightPx; }
    ctx.font = `${style} ${bodyWeight} ${fontSize}px "${bodyFamily.replaceAll('"','\\"')}"`;
    ctx.fillStyle = textColor;
  }
  for (const line of bodyLines) { ctx.fillText(line, TEXT_BOX_LEFT, y); y += lineHeightPx; }

  drawUsername(ctx, '@' + username.replace(/^@/, ''), width, height, PADDING, style, headingFamily, headingWeight);
  if (page) {
    drawPager(ctx, width, height, PADDING, page.index, page.total, page.showArrow);
  }
}

export async function renderSlides(opts: {
  slides: Slide[];
  theme: Theme;
  defaults: Defaults;
  username: string;
  mode: 'story' | 'carousel';
  settings: CarouselSettings;
  quality?: number;
}): Promise<Blob[]> {
  const { slides, theme, defaults, username, mode, settings, quality = 0.95 } = opts;
  const preset = CANVAS_PRESETS[mode];
  const cnv = document.createElement('canvas');
  cnv.width = preset.w;
  cnv.height = preset.h;
  const ctx = cnv.getContext('2d')!;
  const lastImage = slides.map(s => s.image).filter(Boolean).pop();
  const blobs: Blob[] = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = { ...slides[i] } as Slide;
    if (!slide.image && lastImage) slide.image = lastImage;
    await renderSlideToCanvas(slide, ctx, {
      frame: {
        width: preset.w,
        height: preset.h,
        paddingX: 72,
        paddingTop: 72,
        paddingBottom: 72,
        safeNickname: 120,
        safePagination: 120,
      },
      theme,
      defaults,
      username: username.replace(/^@/, ''),
      page: { index: i + 1, total: slides.length, showArrow: i + 1 < slides.length },
      settings,
    });
    const blob = await new Promise<Blob>(res =>
      cnv.toBlob(b => res(b!), 'image/jpeg', quality)!
    );
    blobs.push(blob);
  }
  return blobs;
}

export async function exportAll(opts: {
  slides: Slide[];
  theme: Theme;
  defaults: Defaults;
  username: string;
  mode: 'story' | 'carousel';
  settings: CarouselSettings;
  quality?: number;
}) {
  const blobs = await renderSlides(opts);
  if (navigator.canShare && typeof navigator.canShare === 'function') {
    for (const [i, blob] of blobs.entries()) {
      const file = new File([blob], `slide-${i + 1}.jpg`, { type: 'image/jpeg' });
      try {
        await (navigator as any).share({ files: [file], title: 'Carousel' });
      } catch {}
    }
    return;
  }
  const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  const zip = new JSZip();
  blobs.forEach((blob, i) => zip.file(`slide-${i + 1}.jpg`, blob));
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'carousel.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
