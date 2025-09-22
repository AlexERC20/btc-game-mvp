export type FontId =
  | 'system'
  | 'inter'
  | 'dm-sans'
  | 'roboto'
  | 'montserrat'
  | 'poppins'
  | 'playfair'
  | 'bodoni'
  | 'lora'
  | 'raleway'
  | 'dancing-script';

export type FontMeta = {
  id: FontId;
  label: string;
  cssStack: string;
  previewText?: string;
  kind: 'sans' | 'serif' | 'display';
};

export const FONTS: FontMeta[] = [
  {
    id: 'system',
    label: 'System',
    cssStack:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
    kind: 'sans',
  },
  {
    id: 'inter',
    label: 'Inter',
    cssStack:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    kind: 'sans',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    cssStack:
      '"DM Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    kind: 'sans',
  },
  {
    id: 'roboto',
    label: 'Roboto',
    cssStack: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    kind: 'sans',
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    cssStack:
      '"Montserrat", "Inter", -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    kind: 'sans',
  },
  {
    id: 'poppins',
    label: 'Poppins',
    cssStack:
      '"Poppins", "Inter", -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    kind: 'sans',
  },
  {
    id: 'playfair',
    label: 'Playfair',
    cssStack: '"Playfair Display", Georgia, "Times New Roman", serif',
    kind: 'serif',
  },
  {
    id: 'bodoni',
    label: 'Bodoni',
    cssStack: '"Bodoni Moda", Didot, "Bodoni 72", serif',
    kind: 'serif',
  },
  {
    id: 'lora',
    label: 'Lora',
    cssStack: '"Lora", Georgia, "Times New Roman", serif',
    kind: 'serif',
  },
  {
    id: 'raleway',
    label: 'Raleway',
    cssStack: '"Raleway", "Inter", Arial, sans-serif',
    kind: 'display',
  },
  {
    id: 'dancing-script',
    label: 'Dancing Script',
    cssStack: '"Dancing Script", "Comic Sans MS", "Segoe Script", cursive',
    kind: 'display',
  },
];

const FONT_LOOKUP = FONTS.reduce<Record<FontId, FontMeta>>((acc, font) => {
  acc[font.id] = font;
  return acc;
}, {} as Record<FontId, FontMeta>);

export function getFontMeta(id: FontId): FontMeta {
  return FONT_LOOKUP[id] ?? FONTS[0];
}

export function getFontStack(id: FontId): string {
  return getFontMeta(id).cssStack;
}
