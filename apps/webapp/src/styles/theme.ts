import type {
  LayoutStyle,
  Slide,
  TemplateConfig,
  TypographySettings,
} from '@/state/store';
import { getBaseTextColor, getHeadingColor } from '@/state/store';
import { createTypography, Typography } from './typography';

export type Theme = {
  textColor: string;
  titleColor?: string | null;
  padding: { x: number; y: number };
  radius: number;
  gradient: 'original' | 'darkFooter' | 'lightFooter';
  gradientStops: { from: string; to: string; heightPct: number };
  shadow?: { blur: number; color: string; y: number };
};

export type SlideDesign = {
  template: TemplateConfig;
  layout: LayoutStyle;
  typography: Typography;
  theme: Theme;
};

const DEFAULT_RADIUS = 16;
const OVERLAY_GUTTER = 12;

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

export function createTheme(
  slide: Slide,
  template: TemplateConfig,
  layout: LayoutStyle,
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

  return {
    textColor: baseColor,
    titleColor: headingAccent ? getHeadingColor(bgTone, mode, headingAccent) : null,
    padding: {
      x: OVERLAY_GUTTER + layout.padding,
      y: OVERLAY_GUTTER + layout.padding,
    },
    radius: DEFAULT_RADIUS,
    gradient,
    gradientStops: {
      from: gradientStops.from,
      to: gradientStops.to,
      heightPct,
    },
    shadow: TEXT_SHADOW_MAP[template.textShadow] ?? undefined,
  };
}

function mergeTemplate(base: TemplateConfig, override?: TemplateConfig): TemplateConfig {
  return override ? { ...base, ...override } : { ...base };
}

function mergeLayout(base: LayoutStyle, override?: LayoutStyle): LayoutStyle {
  return override ? { ...base, ...override } : { ...base };
}

export function resolveSlideDesign(params: {
  slide: Slide;
  baseTemplate: TemplateConfig;
  baseLayout: LayoutStyle;
  typographySettings: TypographySettings;
}): SlideDesign {
  const template = mergeTemplate(params.baseTemplate, params.slide.overrides?.template);
  const layout = mergeLayout(params.baseLayout, params.slide.overrides?.layout);
  const typography = createTypography(template, layout);
  const theme = createTheme(params.slide, template, layout, params.typographySettings);

  return { template, layout, typography, theme };
}
