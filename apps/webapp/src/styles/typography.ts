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

function getFontFamily(font: TemplateConfig['font']): string {
  const stack = FONT_STACK[font];
  return stack ?? FALLBACK_STACK;
}

function computeTitleSize(layout: LayoutStyle): { fontSize: number; lineHeight: number } {
  const fontSize = Math.round(layout.fontSize * 1.35);
  const lineHeight = (layout.lineHeight * 1.2) / 1.3;
  return { fontSize, lineHeight };
}

function computeBodySize(layout: LayoutStyle): { fontSize: number; lineHeight: number } {
  const fontSize = Math.round(layout.fontSize * 0.9);
  const lineHeight = (layout.lineHeight * 1.35) / 1.3;
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
      lineHeight: Number(titleSize.lineHeight.toFixed(3)),
      letterSpacing: 0,
    },
    body: {
      fontFamily: family,
      fontWeight: 400,
      fontSize: bodySize.fontSize,
      lineHeight: Number(bodySize.lineHeight.toFixed(3)),
      letterSpacing: 0,
    },
  };
}

export function typographyToCanvasFont(style: Typography['title'] | Typography['body']): string {
  return `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
}
