import type { LayoutStyle, TemplateConfig } from '@/state/store';

export type Typography = {
  title: {
    fontFamily: string;
    fontWeight: number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
  };
  body: {
    fontFamily: string;
    fontWeight: number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
  };
};

const FALLBACK_STACK = '"Inter", "SF Pro Text", Arial, sans-serif';

const FONT_STACK: Record<TemplateConfig['font'], string> = {
  system: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, Arial, sans-serif`,
  inter: `"Inter", "SF Pro Text", Arial, sans-serif`,
  playfair: `"Playfair Display", "Times New Roman", Times, serif, ${FALLBACK_STACK}`,
  bodoni: `"Bodoni Moda", "Didot", "Bodoni 72", serif, ${FALLBACK_STACK}`,
  dmsans: `"DM Sans", ${FALLBACK_STACK}`,
};

const BODY_FONT_SIZE_BASE = 28;
const BODY_LINE_HEIGHT_BASE = 1.25;
const TITLE_FONT_SIZE_BASE = 48;
const TITLE_LINE_HEIGHT_BASE = 1.15;

const TITLE_FONT_SCALE = TITLE_FONT_SIZE_BASE / BODY_FONT_SIZE_BASE;
const TITLE_LINE_SCALE = TITLE_LINE_HEIGHT_BASE / BODY_LINE_HEIGHT_BASE;

function getFontFamily(font: TemplateConfig['font']): string {
  const stack = FONT_STACK[font];
  return stack ?? FALLBACK_STACK;
}

function normalizeFontSize(value: number): number {
  return value > 0 ? value : BODY_FONT_SIZE_BASE;
}

function normalizeLineHeight(value: number): number {
  return value > 0 ? value : BODY_LINE_HEIGHT_BASE;
}

function computeTitleSize(layout: LayoutStyle): { fontSize: number; lineHeight: number } {
  const bodyFontSize = normalizeFontSize(layout.fontSize);
  const bodyLineHeight = normalizeLineHeight(layout.lineHeight);
  const fontSize = Number((bodyFontSize * TITLE_FONT_SCALE).toFixed(3));
  const lineHeight = Number((bodyLineHeight * TITLE_LINE_SCALE).toFixed(3));
  return { fontSize, lineHeight };
}

function computeBodySize(layout: LayoutStyle): { fontSize: number; lineHeight: number } {
  const fontSize = Number(normalizeFontSize(layout.fontSize).toFixed(3));
  const lineHeight = Number(normalizeLineHeight(layout.lineHeight).toFixed(3));
  return { fontSize, lineHeight };
}

export function createTypography(template: TemplateConfig, layout: LayoutStyle): Typography {
  const family = getFontFamily(template.font);
  const titleSize = computeTitleSize(layout);
  const bodySize = computeBodySize(layout);

  return {
    title: {
      fontFamily: family,
      fontWeight: 700,
      fontSize: titleSize.fontSize,
      lineHeight: titleSize.lineHeight,
      letterSpacing: 0,
    },
    body: {
      fontFamily: family,
      fontWeight: 400,
      fontSize: bodySize.fontSize,
      lineHeight: bodySize.lineHeight,
      letterSpacing: 0,
    },
  };
}

export function typographyToCanvasFont(style: Typography['title'] | Typography['body']): string {
  return `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
}
