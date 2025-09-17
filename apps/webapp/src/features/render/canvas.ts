import { BASE_FRAME } from './constants';
import type { LayoutConfig, PhotoTransform, TemplateConfig } from '@/state/store';
import {
  Slide,
  layoutSnapshot,
  useCarouselStore,
  normalizeCollage,
  normalizeSingle,
} from '@/state/store';
import { resolveSlideDesign, Theme } from '@/styles/theme';
import { Typography, typographyToCanvasFont } from '@/styles/typography';
import { splitEditorialText } from '@/utils/text';
import { composeTextLines } from '@/utils/textLayout';
import { resolveBlockPosition, resolveBlockWidth } from '@/utils/layoutGeometry';
import { resolvePhotoFromStore } from '@/utils/photos';
import { computeCollageBoxes } from '@/utils/collage';
import { placeImage } from '@/utils/placeImage';
import { applyOpacityToColor } from '@/utils/color';

export const CANVAS_W = BASE_FRAME.width;
export const CANVAS_H = BASE_FRAME.height;

type Rect = { x: number; y: number; width: number; height: number };

function drawImageWithTransform(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: Rect,
  transform?: PhotoTransform,
) {
  const imageWidth = img.naturalWidth || img.width;
  const imageHeight = img.naturalHeight || img.height;
  if (!imageWidth || !imageHeight) return;

  const placement = placeImage(box, imageWidth, imageHeight, transform);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.drawImage(img, placement.left, placement.top, placement.width, placement.height);
  ctx.restore();
}

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
  layout: LayoutConfig,
  template: TemplateConfig,
) {
  const { title, body } = splitEditorialText(slide.body ?? '');

  const containerWidth = CANVAS_W;
  const containerHeight = CANVAS_H;
  const { blockWidth, textWidth } = resolveBlockWidth(containerWidth, layout);

  const composition = composeTextLines({
    ctx,
    maxWidth: textWidth,
    title,
    body,
    typography,
    colors: {
      title: theme.titleColor ?? theme.textColor,
      body: theme.textColor,
    },
    paragraphGap: layout.paragraphGap,
    overflow: layout.overflow,
    maxLines: layout.maxLines,
  });

  const blockHeight = composition.contentHeight + layout.padding * 2;
  const blockPosition = resolveBlockPosition(
    containerWidth,
    containerHeight,
    layout,
    blockWidth,
    blockHeight,
  );

  const textX = blockPosition.x + layout.padding;
  const textY = blockPosition.y + layout.padding;

  if (composition.lines.length) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
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

    let cursorY = textY;
    for (const line of composition.lines) {
      cursorY += line.gapBefore;
      const baselineY = cursorY + line.metrics.baselineOffset;
      ctx.font = typographyToCanvasFont(line.style);
      ctx.fillStyle = line.color;
      drawLine(ctx, line.text, textX, baselineY, line.letterSpacing);
      cursorY += line.metrics.lineHeight;
    }

    ctx.restore();

    if (composition.fadeMaskStart !== undefined) {
      const textHeight = composition.contentHeight;
      const fadeStart = textY + textHeight * composition.fadeMaskStart;
      const fadeHeight = textHeight * (1 - composition.fadeMaskStart);
      if (fadeHeight > 0 && textWidth > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const gradient = ctx.createLinearGradient(0, fadeStart, 0, fadeStart + fadeHeight);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(textX, fadeStart, textWidth, fadeHeight);
        ctx.restore();
      }
    }
  }

  if (slide.nickname && template.showNickname) {
    drawNickname(
      ctx,
      slide.nickname,
      typography,
      theme,
      layout,
      {
        x: blockPosition.x,
        y: blockPosition.y,
        width: blockWidth,
        height: blockHeight,
      },
    );
  }
}

const NICK_FONT_SIZE: Record<LayoutConfig['nickname']['size'], number> = {
  S: 18,
  M: 22,
  L: 28,
};

function drawNickname(
  ctx: CanvasRenderingContext2D,
  nickname: string,
  typography: Typography,
  theme: Theme,
  layout: LayoutConfig,
  block: { x: number; y: number; width: number; height: number },
) {
  if (!nickname) return;

  const fontSize = NICK_FONT_SIZE[layout.nickname.size] ?? 18;
  const paddingX = Math.round(fontSize * 0.75);
  const paddingY = Math.round(fontSize * 0.35);
  const font = `600 ${fontSize}px ${typography.body.fontFamily}`;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(nickname).width;
  const width = textWidth + paddingX * 2;
  const height = fontSize + paddingY * 2;

  let x: number;
  switch (layout.nickname.position) {
    case 'center':
      x = block.x + (block.width - width) / 2;
      break;
    case 'right':
      x = block.x + block.width - width;
      break;
    default:
      x = block.x;
      break;
  }
  x = Math.max(0, Math.min(x, CANVAS_W - width));

  const baseY = block.y + block.height + layout.nickname.offset;
  const maxY = CANVAS_H - height;
  const y = Math.max(0, Math.min(baseY, maxY));

  const opacity = Math.max(0, Math.min(layout.nickname.opacity, 1));
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
  const radius = height / 2;

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

export async function renderSlideToPNG(slide: Slide, exportScale = 1): Promise<Blob> {
  const state = useCarouselStore.getState();
  const design = resolveSlideDesign({
    slide,
    baseTemplate: state.style.template,
    baseLayout: layoutSnapshot(),
    typographySettings: state.typography,
  });

  const canvas = document.createElement('canvas');
  const pixelWidth = CANVAS_W * exportScale;
  const pixelHeight = CANVAS_H * exportScale;
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  await ensureFontsLoaded(design.typography);

  const collageConfig = normalizeCollage(slide.collage50);
  const isCollage = slide.template === 'collage-50';
  let singleImage: HTMLImageElement | null = null;
  let topImage: HTMLImageElement | null = null;
  let bottomImage: HTMLImageElement | null = null;

  const singleConfig = normalizeSingle(slide.single);

  if (isCollage) {
    const topSrc = resolvePhotoFromStore(collageConfig.top.photoId);
    const bottomSrc = resolvePhotoFromStore(collageConfig.bottom.photoId);
    [topImage, bottomImage] = await Promise.all([
      topSrc ? loadImage(topSrc) : Promise.resolve(null),
      bottomSrc ? loadImage(bottomSrc) : Promise.resolve(null),
    ]);
  } else {
    const imageSrc = slide.image ?? resolvePhotoFromStore(slide.photoId);
    singleImage = imageSrc ? await loadImage(imageSrc) : null;
  }

  ctx.clearRect(0, 0, pixelWidth, pixelHeight);
  ctx.scale(exportScale, exportScale);
  ctx.save();
  roundedRectPath(ctx, 0, 0, CANVAS_W, CANVAS_H, design.theme.radius);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (isCollage) {
    const boxes = computeCollageBoxes(collageConfig.dividerPx);
    const placeholder = 'rgba(0,0,0,0.08)';

    if (boxes.top.height > 0) {
      if (topImage) {
        drawImageWithTransform(ctx, topImage, boxes.top, collageConfig.top.transform);
      } else {
        ctx.fillStyle = placeholder;
        ctx.fillRect(boxes.top.x, boxes.top.y, boxes.top.width, boxes.top.height);
      }
    }

    if (boxes.bottom.height > 0) {
      if (bottomImage) {
        drawImageWithTransform(ctx, bottomImage, boxes.bottom, collageConfig.bottom.transform);
      } else {
        ctx.fillStyle = placeholder;
        ctx.fillRect(boxes.bottom.x, boxes.bottom.y, boxes.bottom.width, boxes.bottom.height);
      }
    }

    if (boxes.divider.height > 0) {
      const baseColor =
        collageConfig.dividerColor === 'auto'
          ? design.theme.textColor
          : collageConfig.dividerColor;
      ctx.fillStyle = applyOpacityToColor(
        baseColor,
        collageConfig.dividerOpacity,
      );
      ctx.fillRect(0, boxes.divider.y, CANVAS_W, boxes.divider.height);
    }
  } else if (singleImage) {
    drawImageWithTransform(
      ctx,
      singleImage,
      { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H },
      singleConfig.transform,
    );
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
