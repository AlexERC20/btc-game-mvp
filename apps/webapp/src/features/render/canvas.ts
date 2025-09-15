import type { LayoutStyle, TemplateConfig } from '@/state/store';
import { Slide, useCarouselStore } from '@/state/store';
import { resolveSlideDesign, Theme } from '@/styles/theme';
import { Typography, typographyToCanvasFont } from '@/styles/typography';
import { splitEditorialText } from '@/utils/text';
import { applyEllipsis, layoutParagraph } from '@/utils/textLayout';

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;

type TextLine = {
  text: string;
  style: Typography['title'] | Typography['body'];
  color: string;
  letterSpacing: number;
  gapBefore: number;
};

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const imageRatio = img.naturalWidth / img.naturalHeight || 1;
  const canvasRatio = CANVAS_W / CANVAS_H;

  let drawWidth = CANVAS_W;
  let drawHeight = CANVAS_H;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > canvasRatio) {
    drawHeight = CANVAS_H;
    drawWidth = drawHeight * imageRatio;
    offsetX = (CANVAS_W - drawWidth) / 2;
  } else {
    drawWidth = CANVAS_W;
    drawHeight = drawWidth / imageRatio;
    offsetY = (CANVAS_H - drawHeight) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

function drawFooterGradient(ctx: CanvasRenderingContext2D, theme: Theme) {
  if (theme.gradient === 'original') return;
  const heightPct = Math.max(0, Math.min(theme.gradientStops.heightPct, 1));
  if (!heightPct) return;

  const gradientHeight = CANVAS_H * heightPct;
  const gradient = ctx.createLinearGradient(0, CANVAS_H, 0, CANVAS_H - gradientHeight);
  gradient.addColorStop(0, theme.gradientStops.to);
  gradient.addColorStop(1, theme.gradientStops.from);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, CANVAS_H - gradientHeight, CANVAS_W, gradientHeight);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
) {
  if (!text) return;
  if (!letterSpacing) {
    ctx.fillText(text, x, y);
    return;
  }

  const chars = Array.from(text);
  let cursor = x;
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    ctx.fillText(ch, cursor, y);
    const advance = ctx.measureText(ch).width;
    if (i < chars.length - 1) {
      cursor += advance + letterSpacing;
    }
  }
}

function lineHeightPx(style: Typography['title'] | Typography['body']) {
  return style.fontSize * style.lineHeight;
}

function totalHeight(lines: TextLine[]): number {
  return lines.reduce((sum, line) => sum + line.gapBefore + lineHeightPx(line.style), 0);
}

function trimLinesToHeight(
  ctx: CanvasRenderingContext2D,
  lines: TextLine[],
  availableHeight: number,
  maxWidth: number,
) {
  let trimmed = false;
  let height = totalHeight(lines);
  while (lines.length && height > availableHeight) {
    lines.pop();
    trimmed = true;
    height = totalHeight(lines);
  }

  if (!lines.length) return;

  if (trimmed) {
    const last = lines[lines.length - 1];
    ctx.font = typographyToCanvasFont(last.style);
    last.text = applyEllipsis(ctx, last.text, maxWidth, last.letterSpacing);
  }
}

async function ensureFontsLoaded(typography: Typography) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const toLoad = new Set<string>([
    typographyToCanvasFont(typography.title),
    typographyToCanvasFont(typography.body),
  ]);

  const loaders = Array.from(toLoad).map((font) => document.fonts.load(font));
  await Promise.all(loaders);
  await document.fonts.ready;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  typography: Typography,
  theme: Theme,
  layout: LayoutStyle,
  template: TemplateConfig,
) {
  const { title, body } = splitEditorialText(slide.body ?? '');

  const overlayInset = Math.max(theme.padding.x - layout.padding, 0);
  const overlayWidth = CANVAS_W - overlayInset * 2;
  const blockWidth = Math.max(0, Math.min(layout.blockWidth, 100));
  const blockPx = (overlayWidth * blockWidth) / 100;
  const maxWidth = Math.max(blockPx - layout.padding * 2, 0);

  const contentTop = theme.padding.y;
  const contentBottom = CANVAS_H - theme.padding.y;
  const availableHeight = Math.max(contentBottom - contentTop, 0);
  const canLayout = maxWidth > 0 && availableHeight > 0;
  const lines: TextLine[] = [];

  if (canLayout && title) {
    ctx.font = typographyToCanvasFont(typography.title);
    const titleLines = layoutParagraph(
      ctx,
      title,
      maxWidth,
      typography.title.lineHeight,
      typography.title.letterSpacing,
    );
    for (const line of titleLines) {
      lines.push({
        text: line,
        style: typography.title,
        color: theme.titleColor ?? theme.textColor,
        letterSpacing: typography.title.letterSpacing,
        gapBefore: 0,
      });
    }
  }

  if (canLayout && body) {
    ctx.font = typographyToCanvasFont(typography.body);
    const bodyLines = layoutParagraph(
      ctx,
      body,
      maxWidth,
      typography.body.lineHeight,
      typography.body.letterSpacing,
    );
    bodyLines.forEach((line, index) => {
      lines.push({
        text: line,
        style: typography.body,
        color: theme.textColor,
        letterSpacing: typography.body.letterSpacing,
        gapBefore: index === 0 && lines.length ? layout.paraGap : 0,
      });
    });
  }

  let usedHeight = 0;
  if (canLayout && lines.length) {
    trimLinesToHeight(ctx, lines, availableHeight, maxWidth);
    usedHeight = totalHeight(lines);

    let cursorY = contentBottom - usedHeight;
    if (cursorY < contentTop) cursorY = contentTop;
    const textX = theme.padding.x;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (theme.shadow) {
      ctx.shadowColor = theme.shadow.color;
      ctx.shadowBlur = theme.shadow.blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = theme.shadow.y;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    for (const line of lines) {
      cursorY += line.gapBefore;
      ctx.font = typographyToCanvasFont(line.style);
      ctx.fillStyle = line.color;
      drawLine(ctx, line.text, textX, cursorY, line.letterSpacing);
      cursorY += lineHeightPx(line.style);
    }

    ctx.restore();
  }

  if (slide.nickname && template.showNickname) {
    drawNickname(
      ctx,
      slide.nickname,
      typography,
      theme,
      layout,
      contentBottom,
    );
  }
}

const NICK_FONT_SIZE: Record<LayoutStyle['nickSize'], number> = {
  s: 12,
  m: 14,
  l: 16,
};

function drawNickname(
  ctx: CanvasRenderingContext2D,
  nickname: string,
  typography: Typography,
  theme: Theme,
  layout: LayoutStyle,
  textBottom: number,
) {
  if (!nickname) return;

  const fontSize = NICK_FONT_SIZE[layout.nickSize] ?? 12;
  const paddingX = fontSize <= 12 ? 12 : 14;
  const paddingY = 6;
  const font = `600 ${fontSize}px ${typography.body.fontFamily}`;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(nickname).width;
  const width = textWidth + paddingX * 2;
  const height = fontSize + paddingY * 2;

  const overlayInset = Math.max(theme.padding.x - layout.padding, 0);
  const overlayWidth = CANVAS_W - overlayInset * 2;

  let x: number;
  switch (layout.nickPos) {
    case 'center':
      x = overlayInset + (overlayWidth - width) / 2;
      break;
    case 'right':
      x = CANVAS_W - overlayInset - width;
      break;
    default:
      x = theme.padding.x;
      break;
  }
  x = Math.max(overlayInset, Math.min(x, CANVAS_W - overlayInset - width));

  const overlayBottom = Math.max(theme.padding.y - layout.padding, 0);
  const baseY = textBottom + layout.nickOffset;
  const maxY = CANVAS_H - overlayBottom - height;
  const y = Math.min(baseY, maxY);

  const opacity = Math.max(0, Math.min(layout.nickOpacity ?? 100, 100)) / 100;
  const normalizedColor = theme.textColor.trim().toLowerCase();
  const isDarkText =
    normalizedColor === '#000000' ||
    normalizedColor === 'black' ||
    normalizedColor === 'rgb(0,0,0)';
  const backgroundAlpha = (isDarkText ? 0.85 : 0.45) * opacity;
  const strokeAlpha = (isDarkText ? 0.2 : 0.18) * opacity;
  const background = isDarkText
    ? `rgba(255,255,255,${backgroundAlpha.toFixed(3)})`
    : `rgba(0,0,0,${backgroundAlpha.toFixed(3)})`;
  const stroke = isDarkText
    ? `rgba(0,0,0,${strokeAlpha.toFixed(3)})`
    : `rgba(255,255,255,${strokeAlpha.toFixed(3)})`;
  const radius = Math.min(layout.nickRadius ?? height / 2, height / 2);

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1;
  ctx.fillStyle = background;
  ctx.strokeStyle = stroke;

  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
  if (strokeAlpha > 0) ctx.stroke();

  ctx.fillStyle = theme.textColor;
  ctx.fillText(nickname, x + paddingX, y + height / 2);

  ctx.restore();
}

export async function renderSlideToPNG(slide: Slide): Promise<Blob> {
  const state = useCarouselStore.getState();
  const design = resolveSlideDesign({
    slide,
    baseTemplate: state.style.template,
    baseLayout: state.style.layout,
    typographySettings: state.typography,
  });

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const imagePromise = slide.image ? loadImage(slide.image) : Promise.resolve<HTMLImageElement | null>(null);
  await ensureFontsLoaded(design.typography);
  const image = await imagePromise;

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.save();
  roundedRectPath(ctx, 0, 0, CANVAS_W, CANVAS_H, design.theme.radius);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (image) {
    drawCover(ctx, image);
  }

  drawFooterGradient(ctx, design.theme);
  drawOverlay(ctx, slide, design.typography, design.theme, design.layout, design.template);
  ctx.restore();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}
