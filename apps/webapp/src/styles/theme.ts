import type {
  LayoutConfig,
  Slide,
  TemplateConfig,
  TypographySettings,
} from '@/state/store';
import { getBaseTextColor, getHeadingColor, useFontStore } from '@/state/store';
import type { FontId } from '@/features/fonts/fonts';
import { getFontStack } from '@/features/fonts/fonts';
import { createTypography, Typography } from './typography';

export type Theme = {
  textColor: string;
  titleColor?: string | null;
  radius: number;
  gradient: 'original' | 'darkFooter' | 'lightFooter';
  gradientStops: { from: string; to: string; heightPct: number };
  shadow?: { blur: number; color: string; y: number };
};

export type SlideDesign = {
  template: TemplateConfig;
  layout: LayoutConfig;
  typography: Typography;
  theme: Theme;
};

const TEXT_SHADOW_MAP: Record<number, Theme['shadow'] | undefined> = {
  0: undefined,
  1: { blur: 12, color: 'rgba(0,0,0,0.45)', y: 2 },
  2: { blur: 18, color: 'rgba(0,0,0,0.55)', y: 4 },
  3: { blur: 24, color: 'rgba(0,0,0,0.65)', y: 6 },
};

const GRADIENT_COLORS: Record<Theme['gradient'], { from: string; to: string }> = {
  original: { from: 'rgba(0,0,0,0)', to: 'rgba(0,0,0,0)' },
  darkFooter: { from: 'rgba(0,0,0,0)', to: 'rgba(0,0,0,0.7)' },
  lightFooter: { from: 'rgba(255,255,255,0)', to: 'rgba(255,255,255,0.7)' },
};

function clampHeight(value: number) {
  return Math.max(0, Math.min(value, 100)) / 100;
}

function applyIntensity(color: string, intensity: number) {
  const match = color.match(/rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\)/i);
  if (!match) return color;
  const [, r, g, b, a] = match;
  const nextAlpha = Math.max(0, Math.min(Number(a) * intensity, 1));
  return `rgba(${r},${g},${b},${nextAlpha.toFixed(3)})`;
}

export function createTheme(
  slide: Slide,
  template: TemplateConfig,
  layout: LayoutConfig,
  typographySettings: TypographySettings,
): Theme {
  const mode = typographySettings.textColorMode ?? template.textColorMode;
  const bgTone =
    slide.runtime?.bgTone ?? (mode === 'black' ? 'light' : mode === 'white' ? 'dark' : 'dark');
  const baseColor = getBaseTextColor(bgTone, mode);
  const headingAccent = typographySettings.headingAccent;
  const gradient: Theme['gradient'] =
    template.footerStyle === 'dark'
      ? 'darkFooter'
      : template.footerStyle === 'light'
      ? 'lightFooter'
      : 'original';
  const gradientStops = GRADIENT_COLORS[gradient];
  const heightPct = gradient === 'original' ? 0 : clampHeight(template.bottomGradient);
  const intensity = gradient === 'original' ? 0 : Math.max(0, Math.min(layout.gradientIntensity, 1));

  return {
    textColor: baseColor,
    titleColor: headingAccent ? getHeadingColor(bgTone, mode, headingAccent) : null,
    radius: Math.max(0, layout.cornerRadius),
    gradient,
    gradientStops: {
      from: applyIntensity(gradientStops.from, intensity),
      to: applyIntensity(gradientStops.to, intensity),
      heightPct,
    },
    shadow: TEXT_SHADOW_MAP[layout.textShadow] ?? undefined,
  };
}

function mergeTemplate(base: TemplateConfig, override?: TemplateConfig): TemplateConfig {
  return override ? { ...base, ...override } : { ...base };
}

function mergeLayout(base: LayoutConfig, override?: Partial<LayoutConfig>): LayoutConfig {
  if (!override) {
    return {
      ...base,
      text: { ...base.text },
      nickname: { ...base.nickname },
    };
  }

  const merged = {
    ...base,
    ...override,
    text: {
      ...base.text,
      ...(override.text ?? {}),
    },
    nickname: {
      ...base.nickname,
      ...(override.nickname ?? {}),
    },
  };

  if (!merged.text.hAlign) merged.text.hAlign = 'left';

  return merged;
}

export function resolveSlideDesign(params: {
  slide: Slide;
  baseTemplate: TemplateConfig;
  baseLayout: LayoutConfig;
  typographySettings: TypographySettings;
  fontId?: FontId;
}): SlideDesign {
  const template = mergeTemplate(params.baseTemplate, params.slide.overrides?.template);
  const layout = mergeLayout(params.baseLayout, params.slide.overrides?.layout);
  const activeFontId = params.fontId ?? useFontStore.getState().fontId;
  const typography = createTypography(template, layout, getFontStack(activeFontId));
  const theme = createTheme(params.slide, template, layout, params.typographySettings);

  return { template, layout, typography, theme };
}
