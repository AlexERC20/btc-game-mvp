import { create, type StoreApi } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FontId } from '@/features/fonts/fonts';
import { getExportSlides } from '@/utils/getExportSlides';

export type PhotoId = string;

export interface Photo {
  id: PhotoId;
  src: string;
  fileName?: string;
  width?: number;
  height?: number;
  createdAt: number;
}

export interface PhotosState {
  items: Photo[];
  selectedId?: PhotoId;
}

const MAX_PHOTOS = 100;
const MAX_SIZE = 30 * 1024 * 1024;

export const usePhotos = create<PhotosState>(() => ({ items: [], selectedId: undefined }));

export type CropSlot = 'single' | 'top' | 'bottom';

export type CropState = {
  active: boolean;
  slot: CropSlot | null;
  slideId: string | null;
};

type UIState = {
  crop: CropState;
  setCrop: (patch: Partial<CropState>) => void;
};

export const useUIStore = create<UIState>((set) => ({
  crop: { active: false, slot: null, slideId: null },
  setCrop: (patch) =>
    set((state) => ({
      crop: { ...state.crop, ...patch },
    })),
}));

export const DEFAULT_TRANSFORM: PhotoTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export function createDefaultTransform(): PhotoTransform {
  return { ...DEFAULT_TRANSFORM };
}

function normalizeTransform(transform?: Partial<PhotoTransform>): PhotoTransform {
  const base = createDefaultTransform();
  return {
    scale: transform?.scale ?? base.scale,
    offsetX: transform?.offsetX ?? base.offsetX,
    offsetY: transform?.offsetY ?? base.offsetY,
  };
}

export function createDefaultCollageSlot(): CollageSlot {
  return { photoId: undefined, transform: createDefaultTransform() };
}

function normalizeCollageSlot(slot?: CollageSlot): CollageSlot {
  if (!slot) return createDefaultCollageSlot();
  return {
    photoId: slot.photoId,
    transform: normalizeTransform(slot.transform),
  };
}

export type PhotoTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type SingleSlot = {
  transform: PhotoTransform;
};

export type CollageSlot = {
  photoId?: string;
  transform: PhotoTransform;
};

export type Collage50 = {
  top: CollageSlot;
  bottom: CollageSlot;
  dividerPx: number;
  dividerColor: string;
  dividerOpacity: number;
};

type MoveDirection = 'left' | 'right';

export const photosActions = {
  addFiles(files: File[]) {
    const state = usePhotos.getState();
    const items = [...state.items];
    const space = MAX_PHOTOS - items.length;
    const slice = files.slice(0, space);
    if (files.length > space) console.warn('лимит 100 фото');
    for (const f of slice) {
      if (!f.type.startsWith('image/')) {
        console.warn('не изображение');
        continue;
      }
      if (f.size > MAX_SIZE) {
        console.warn('слишком большой файл');
        continue;
      }
      const id = crypto.randomUUID();
      const src = URL.createObjectURL(f);
      items.push({
        id,
        src,
        fileName: f.name,
        width: undefined,
        height: undefined,
        createdAt: Date.now(),
      });
    }
    usePhotos.setState({ items });
  },

  remove(id: PhotoId) {
    const { items, selectedId } = usePhotos.getState();
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1) return;
    URL.revokeObjectURL(items[idx].src);
    const newItems = items.filter((p) => p.id !== id);
    usePhotos.setState({ items: newItems, selectedId: selectedId === id ? undefined : selectedId });

    useCarouselStore.setState((state) => {
      let dirty = false;
      const slides = state.slides.map((slide) => {
        if (slide.template !== 'collage-50') return slide;
        const collage = normalizeCollage(slide.collage50);
        let changed = false;
        if (collage.top.photoId === id) {
          collage.top = { photoId: undefined, transform: createDefaultTransform() };
          changed = true;
        }
        if (collage.bottom.photoId === id) {
          collage.bottom = { photoId: undefined, transform: createDefaultTransform() };
          changed = true;
        }
        if (!changed) return slide;
        dirty = true;
        return { ...slide, collage50: collage };
      });
      return dirty ? { slides } : {};
    });
  },

  move(id: PhotoId, dir: MoveDirection) {
    const { items } = usePhotos.getState();
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const target = dir === 'left' ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const newItems = [...items];
    [newItems[idx], newItems[target]] = [newItems[target], newItems[idx]];
    usePhotos.setState({ items: newItems });
  },

  setSelected(id?: PhotoId) {
    usePhotos.setState({ selectedId: id });
  },

  clear() {
    const { items } = usePhotos.getState();
    items.forEach((p) => URL.revokeObjectURL(p.src));
    usePhotos.setState({ items: [], selectedId: undefined });
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => photosActions.clear());
}

const createNoopStorage = (): Storage =>
  ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as Storage);

const uid = () => crypto.randomUUID();

type FontState = {
  fontId: FontId;
  setFont: (id: FontId) => void;
};

export const useFontStore = create<FontState>()(
  persist(
    (set) => ({
      fontId: 'inter',
      setFont: (id) => set({ fontId: id }),
    }),
    {
      name: 'carousel.font',
      storage: createJSONStorage<FontState>(() =>
        typeof window !== 'undefined' ? window.localStorage : createNoopStorage(),
      ),
    },
  ),
);

export type NicknameLayout = {
  position: 'left' | 'center' | 'right';
  offset: number;
  size: 'S' | 'M' | 'L';
  opacity: number;
};

export type TextLayout = {
  vAlign: 'top' | 'middle' | 'bottom';
  hAlign: 'left' | 'center' | 'right';
  safeArea: boolean;
  blockWidth: number;
  padding: number;
  maxLines: number;
  overflow: 'wrap' | 'fade';
  lineHeight: number;
};

export type LayoutConfig = {
  text: TextLayout;
  vOffset: number;
  paragraphGap: number;
  cornerRadius: number;
  fontSize: number;
  nickname: NicknameLayout;
  textShadow: 0 | 1 | 2 | 3;
  gradientIntensity: number;
};

export type LayoutState = LayoutConfig & {
  set<K extends keyof LayoutConfig>(key: K, val: LayoutConfig[K]): void;
  setText<K extends keyof TextLayout>(key: K, val: TextLayout[K]): void;
  setNickname<K extends keyof NicknameLayout>(key: K, val: NicknameLayout[K]): void;
  reset(): void;
};

const DEFAULT_LAYOUT: LayoutConfig = {
  text: {
    vAlign: 'bottom',
    hAlign: 'left',
    safeArea: true,
    blockWidth: 0,
    padding: 96,
    maxLines: 8,
    overflow: 'wrap',
    lineHeight: 1.3,
  },
  vOffset: 0,
  paragraphGap: 24,
  cornerRadius: 48,
  fontSize: 28,
  nickname: {
    position: 'left',
    offset: 32,
    size: 'M',
    opacity: 0.85,
  },
  textShadow: 1,
  gradientIntensity: 0.45,
};

const layoutStorage = () =>
  createJSONStorage<LayoutState>(() =>
    (typeof window !== 'undefined' ? window.localStorage : createNoopStorage()),
  );

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      ...DEFAULT_LAYOUT,
      set: (key, val) => {
        set({ [key]: val } as Partial<LayoutState>);
      },
      setText: (key, val) =>
        set((state) => ({
          text: {
            ...state.text,
            [key]: val,
          },
        })),
      setNickname: (key, val) =>
        set((state) => ({
          nickname: {
            ...state.nickname,
            [key]: val,
          },
        })),
      reset: () =>
        set({
          ...DEFAULT_LAYOUT,
          text: { ...DEFAULT_LAYOUT.text },
          nickname: { ...DEFAULT_LAYOUT.nickname },
        }),
    }),
    {
      name: 'layout-settings',
      version: 2,
      storage: layoutStorage(),
      partialize: (state) => ({
        text: state.text,
        vOffset: state.vOffset,
        paragraphGap: state.paragraphGap,
        cornerRadius: state.cornerRadius,
        fontSize: state.fontSize,
        nickname: state.nickname,
        textShadow: state.textShadow,
        gradientIntensity: state.gradientIntensity,
      }),
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState as LayoutConfig;
        const base = {
          ...DEFAULT_LAYOUT,
          text: { ...DEFAULT_LAYOUT.text },
          nickname: { ...DEFAULT_LAYOUT.nickname },
        };
        if (version >= 2) {
          const next = persistedState as Partial<LayoutConfig>;
          return {
            ...base,
            ...next,
            text: {
              ...base.text,
              ...(next.text ?? {}),
              hAlign: (next.text?.hAlign ?? base.text.hAlign) as TextLayout['hAlign'],
            },
            nickname: {
              ...base.nickname,
              ...(next.nickname ?? {}),
            },
          } as LayoutConfig;
        }

        const legacy = persistedState as Partial<Record<string, unknown>>;
        const text: TextLayout = {
          vAlign: (legacy.vertical as TextLayout['vAlign']) ?? base.text.vAlign,
          hAlign: (legacy.horizontal as TextLayout['hAlign']) ?? base.text.hAlign,
          safeArea: Boolean(
            legacy.useSafeArea === undefined ? base.text.safeArea : legacy.useSafeArea,
          ),
          blockWidth: Number(
            legacy.blockWidth === undefined ? base.text.blockWidth : legacy.blockWidth,
          ),
          padding: Number(
            legacy.padding === undefined ? base.text.padding : legacy.padding,
          ),
          maxLines: Number(
            legacy.maxLines === undefined ? base.text.maxLines : legacy.maxLines,
          ),
          overflow: (legacy.overflow as TextLayout['overflow']) ?? base.text.overflow,
          lineHeight: Number(
            legacy.lineHeight === undefined ? base.text.lineHeight : legacy.lineHeight,
          ),
        };
        if (!text.hAlign) text.hAlign = 'left';

        const migrated: LayoutConfig = {
          ...base,
          text,
          vOffset: Number(
            legacy.vOffset === undefined ? base.vOffset : legacy.vOffset,
          ),
          paragraphGap: Number(
            legacy.paragraphGap === undefined ? base.paragraphGap : legacy.paragraphGap,
          ),
          cornerRadius: Number(
            legacy.cornerRadius === undefined ? base.cornerRadius : legacy.cornerRadius,
          ),
          fontSize: Number(
            legacy.fontSize === undefined ? base.fontSize : legacy.fontSize,
          ),
          nickname: {
            ...base.nickname,
            ...(legacy.nickname as Partial<NicknameLayout> | undefined),
          },
          textShadow: (legacy.textShadow as LayoutConfig['textShadow']) ?? base.textShadow,
          gradientIntensity:
            Number(
              legacy.gradientIntensity === undefined
                ? base.gradientIntensity
                : legacy.gradientIntensity,
            ) ?? base.gradientIntensity,
        };

        return migrated;
      },
    },
  ),
);

export function layoutSnapshot(): LayoutConfig {
  const { set, setText, setNickname, reset, ...values } = useLayoutStore.getState();
  return values;
}

export const useLayoutSelector = <T,>(selector: (state: LayoutState) => T) =>
  useLayoutStore(selector);

export type Slide = {
  id: string;
  body?: string;
  text?: { title?: string; body?: string } | null;
  image?: string; // objectURL или http url
  photoId?: PhotoId;
  template: 'single' | 'collage-50';
  collage50?: Collage50;
  single?: SingleSlot;
  nickname?: string;
  overrides?: {
    template?: TemplateConfig;
    layout?: Partial<LayoutConfig>;
  };
  kind?: 'demo' | 'photo';
  isDemo?: boolean;
  runtime?: {
    bgTone: 'dark' | 'light';
  };
};

export const DEFAULT_COLLAGE_50: Collage50 = {
  top: createDefaultCollageSlot(),
  bottom: createDefaultCollageSlot(),
  dividerPx: 2,
  dividerColor: '#FFFFFF',
  dividerOpacity: 0.32,
};

export function createDefaultCollage50(): Collage50 {
  return {
    top: createDefaultCollageSlot(),
    bottom: createDefaultCollageSlot(),
    dividerPx: DEFAULT_COLLAGE_50.dividerPx,
    dividerColor: DEFAULT_COLLAGE_50.dividerColor,
    dividerOpacity: DEFAULT_COLLAGE_50.dividerOpacity,
  };
}

export function normalizeCollage(config?: Collage50): Collage50 {
  if (!config) return createDefaultCollage50();
  return {
    top: normalizeCollageSlot(config.top),
    bottom: normalizeCollageSlot(config.bottom),
    dividerPx: config.dividerPx ?? DEFAULT_COLLAGE_50.dividerPx,
    dividerColor: config.dividerColor ?? DEFAULT_COLLAGE_50.dividerColor,
    dividerOpacity: config.dividerOpacity ?? DEFAULT_COLLAGE_50.dividerOpacity,
  };
}

export function createDefaultSingle(): SingleSlot {
  return { transform: createDefaultTransform() };
}

export function normalizeSingle(single?: SingleSlot): SingleSlot {
  if (!single) return createDefaultSingle();
  return { transform: normalizeTransform(single.transform) };
}

export function createEmptySlide(): Slide {
  return {
    id: uid(),
    template: 'single',
    single: createDefaultSingle(),
    body: '',
    nickname: '',
    text: null,
  };
}

export type UISheet = null | 'template' | 'layout' | 'photos' | 'text';

export interface TextState {
  nickname: string;
  bulkText: string;
}

export type TemplatePreset =
  | 'editorial'
  | 'minimal'
  | 'light'
  | 'focus'
  | 'quote'
  | 'custom';

export type TemplateStyle =
  | 'original'
  | 'darkFooter'
  | 'lightFooter'
  | 'editorial'
  | 'minimal'
  | 'light'
  | 'focus'
  | 'quote';

export interface TemplateConfig {
  preset: TemplatePreset;
  textColorMode: 'auto' | 'white' | 'black';
  accent: string;
  bottomGradient: number;
  dimPhoto: number;
  textShadow: 0 | 1 | 2 | 3;
  showNickname: boolean;
  nicknameStyle: 'pill' | 'tag';
  font: 'system' | 'inter' | 'playfair' | 'bodoni' | 'dmsans';
  footerStyle: 'none' | 'dark' | 'light';
}

export interface TypographySettings {
  textColorMode: 'auto' | 'white' | 'black';
  headingAccent: string | null;
}

export const getBaseTextColor = (
  bg: 'dark' | 'light',
  mode: 'auto' | 'white' | 'black',
) => {
  if (mode === 'white') return '#FFFFFF';
  if (mode === 'black') return '#000000';
  return bg === 'dark' ? '#FFFFFF' : '#000000';
};

export const getHeadingColor = (
  bg: 'dark' | 'light',
  mode: 'auto' | 'white' | 'black',
  accent: string | null,
) => accent ?? getBaseTextColor(bg, mode);

type ApplyScope = 'all' | 'current';

type State = {
  slides: Slide[];
  activeIndex: number;
  activeSheet: UISheet;
  text: TextState;
  templateStyle: TemplateStyle;
  typography: TypographySettings;
  style: {
    template: TemplateConfig;
    templateScope: ApplyScope;
  };

  openSheet: (s: Exclude<UISheet, null>) => void;
  closeSheet: () => void;

  addSlide: (s?: Partial<Slide>) => void;
  removeSlide: (id: string) => void;
  updateSlide: (id: string, patch: Partial<Slide>) => void;
  reorderSlides: (from: number, to: number) => void;
  setActiveIndex: (i: number) => void;

  setTextField: (patch: Partial<TextState>) => void;
  applyTextToSlides: (opts?: { bulkText?: string; nickname?: string }) => void;

  setTemplateStyle: (style: TemplateStyle) => void;
  setTemplatePreset: (p: Exclude<TemplatePreset, 'custom'>) => void;
  setTemplate: (patch: Partial<TemplateConfig>) => void;
  setFooterStyle: (mode: 'none' | 'dark' | 'light', scope?: ApplyScope) => void;
  resetTemplate: () => void;
  setTemplateScope: (s: ApplyScope) => void;
  applyTemplate: () => void;
  setHeadingAccent: (hex: string | null) => void;
  setTextColorMode: (mode: 'auto' | 'white' | 'black') => void;

  setCollageSlot: (slideIndex: number, slot: 'top' | 'bottom', photoId?: string) => void;
  swapCollage: (slideIndex: number) => void;
  setTransform: (slideIndex: number, slot: CropSlot, transform: Partial<PhotoTransform>) => void;
  applyCollageTemplateToAll: () => void;
  autoFillCollage: (photoIds: string[]) => void;
};

let carouselStoreApi: StoreApi<State> | null = null;

const carouselStorage = () =>
  createJSONStorage<State>(() =>
    (typeof window !== 'undefined' ? window.localStorage : createNoopStorage()),
  );

const editorialTemplate: TemplateConfig = {
  preset: 'editorial',
  textColorMode: 'white',
  accent: '#FFFFFF',
  bottomGradient: 38,
  dimPhoto: 6,
  textShadow: 1,
  showNickname: true,
  nicknameStyle: 'pill',
  font: 'inter',
  footerStyle: 'dark',
};

const minimalTemplate: TemplateConfig = {
  preset: 'minimal',
  textColorMode: 'auto',
  accent: '#FFFFFF',
  bottomGradient: 0,
  dimPhoto: 0,
  textShadow: 0,
  showNickname: true,
  nicknameStyle: 'pill',
  font: 'system',
  footerStyle: 'none',
};

const templatePresets: Record<Exclude<TemplatePreset, 'custom'>, TemplateConfig> = {
  editorial: editorialTemplate,
  minimal: minimalTemplate,
  light: {
    ...minimalTemplate,
    preset: 'light',
    bottomGradient: 30,
    textShadow: 1,
    textColorMode: 'white',
    footerStyle: 'dark',
  },
  focus: {
    ...minimalTemplate,
    preset: 'focus',
    bottomGradient: 20,
    dimPhoto: 15,
    textShadow: 2,
    textColorMode: 'white',
    footerStyle: 'dark',
  },
  quote: {
    ...minimalTemplate,
    preset: 'quote',
    bottomGradient: 35,
    dimPhoto: 10,
    textShadow: 2,
    textColorMode: 'white',
    footerStyle: 'dark',
  },
};

const originalTemplate: TemplateConfig = {
  ...editorialTemplate,
  preset: 'custom',
  footerStyle: 'none',
  bottomGradient: 0,
  textColorMode: 'auto',
};

const defaultTemplate = originalTemplate;

export const useCarouselStore = create<State>()(
  persist(
    (set, get, api) => {
      carouselStoreApi = api;
      return {
        slides: [createEmptySlide()],
        activeIndex: 0,
        activeSheet: null,
        text: { nickname: '', bulkText: '' },
        templateStyle: 'original',
        typography: { textColorMode: 'auto', headingAccent: null },
        style: {
          template: defaultTemplate,
          templateScope: 'all',
        },

        openSheet: (s) => set({ activeSheet: s }),
        closeSheet: () => set({ activeSheet: null }),

    addSlide: (s = {}) =>
      set((st) => {
        const template = (s as Slide).template ?? 'single';
        const base = createEmptySlide();
        const id = (s as Slide).id ?? base.id;
        const slide: Slide = {
          ...base,
          ...s,
          id,
          template,
        };

        if (template === 'collage-50') {
          slide.template = 'collage-50';
          slide.collage50 = normalizeCollage((s as Slide).collage50);
          slide.single = undefined;
          slide.photoId = undefined;
          slide.image = undefined;
        } else {
          slide.template = 'single';
          slide.single = normalizeSingle((s as Slide).single);
          slide.collage50 = undefined;
        }

        return {
          slides: [...st.slides, slide],
        };
      }),

    removeSlide: (id) =>
      set((st) => {
        const remaining = st.slides.filter((x) => x.id !== id);
        if (remaining.length === st.slides.length) {
          return {};
        }
        const slides = remaining.length > 0 ? remaining : [createEmptySlide()];
        const maxIndex = slides.length - 1;
        const current = get().activeIndex;
        return {
          slides,
          activeIndex: Math.max(0, Math.min(current, maxIndex)),
        };
      }),

    updateSlide: (id, patch) =>
      set((st) => ({ slides: st.slides.map(s => s.id === id ? { ...s, ...patch } : s) })),

    reorderSlides: (from, to) =>
      set((st) => {
        const slides = [...st.slides];
        const [m] = slides.splice(from, 1);
        slides.splice(Math.max(0, Math.min(to, slides.length)), 0, m);
        return { slides, activeIndex: Math.max(0, Math.min(to, slides.length - 1)) };
      }),

    setActiveIndex: (i) => set({ activeIndex: i }),

    setTextField: (patch) =>
      set((s) => ({ text: { ...s.text, ...patch } })),

    applyTextToSlides: (opts) =>
      set((state) => {
        const nickname = (opts?.nickname ?? state.text.nickname).trim();
        const raw = (opts?.bulkText ?? state.text.bulkText) ?? '';

        const parts = raw
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        const slides = state.slides.map((s, i) => ({
          ...s,
          body: parts[i] ?? '',
          nickname,
        }));

        return {
          slides,
          text: { nickname, bulkText: raw },
        };
      }),

    setTemplateStyle: (styleName) => {
      if (styleName === 'original') {
        get().setFooterStyle('none');
        return;
      }
      if (styleName === 'darkFooter') {
        get().setFooterStyle('dark');
        return;
      }
      if (styleName === 'lightFooter') {
        get().setFooterStyle('light');
        return;
      }
      get().setTemplatePreset(styleName as Exclude<TemplateStyle, 'original' | 'darkFooter' | 'lightFooter'>);
    },

    setTemplatePreset: (p) =>
      set((s) => {
        const preset = templatePresets[p];
        return {
          style: { ...s.style, template: preset },
          templateStyle: p,
          typography: { ...s.typography, textColorMode: preset.textColorMode },
        };
      }),

    setTemplate: (patch) =>
      set((s) => {
        const template = { ...s.style.template, ...patch, preset: 'custom' } as TemplateConfig;
        const slides = s.slides.map((sl, i) => {
          if (s.style.templateScope === 'all' || i === s.activeIndex) {
            return {
              ...sl,
              overrides: {
                ...sl.overrides,
                template: { ...(sl.overrides?.template || {}), ...patch },
              },
            };
          }
          return sl;
        });

        const nextState: Partial<State> = {
          style: { ...s.style, template },
          slides,
        };

        if ('textColorMode' in patch && patch.textColorMode) {
          nextState.typography = {
            ...s.typography,
            textColorMode: patch.textColorMode,
          };
        }

        if ('footerStyle' in patch && patch.footerStyle) {
          nextState.templateStyle =
            patch.footerStyle === 'none'
              ? 'original'
              : patch.footerStyle === 'dark'
              ? 'darkFooter'
              : 'lightFooter';
        }

        return nextState;
      }),

    setFooterStyle: (mode, scope = get().style.templateScope) =>
      set((state) => {
        const patch: Partial<TemplateConfig> =
          mode === 'none'
            ? { footerStyle: 'none', bottomGradient: 0 }
            : mode === 'dark'
            ? { footerStyle: 'dark', bottomGradient: 38, textColorMode: 'white' }
            : { footerStyle: 'light', bottomGradient: 40, textColorMode: 'black' };

        const styleName: TemplateStyle =
          mode === 'none' ? 'original' : mode === 'dark' ? 'darkFooter' : 'lightFooter';

        const slides = state.slides.map((sl, i) => {
          if (scope === 'all' || i === state.activeIndex) {
            return {
              ...sl,
              overrides: {
                ...sl.overrides,
                template: { ...(sl.overrides?.template || {}), ...patch },
              },
            };
          }
          return sl;
        });

        const nextState: Partial<State> = {
          slides,
          style: {
            ...state.style,
            template: { ...state.style.template, ...patch, preset: 'custom' },
          },
          templateStyle: styleName,
        };

        if (patch.textColorMode) {
          nextState.typography = {
            ...state.typography,
            textColorMode: patch.textColorMode,
          };
        }

        return nextState;
      }),

    resetTemplate: () =>
      set((s) => ({
        style: { ...s.style, template: defaultTemplate },
        templateStyle: 'original',
        typography: {
          ...s.typography,
          textColorMode: defaultTemplate.textColorMode,
          headingAccent: null,
        },
      })),

    setTemplateScope: (sc) =>
      set((s) => ({ style: { ...s.style, templateScope: sc } })),

    applyTemplate: () =>
      set((state) => {
        const { template, templateScope } = state.style;
        const slides = state.slides.map((sl, i) => {
          if (templateScope === 'all' || i === state.activeIndex) {
            return {
              ...sl,
              overrides: { ...sl.overrides, template },
            };
          }
          return sl;
        });
        return { slides };
      }),

    setHeadingAccent: (hex) =>
      set((s) => ({ typography: { ...s.typography, headingAccent: hex } })),

    setTextColorMode: (mode) =>
      set((s) => {
        const slides = s.slides.map((sl, i) => {
          if (s.style.templateScope === 'all' || i === s.activeIndex) {
            return {
              ...sl,
              overrides: {
                ...sl.overrides,
                template: { ...(sl.overrides?.template || {}), textColorMode: mode },
              },
            };
          }
          return sl;
        });

        return {
          slides,
          typography: { ...s.typography, textColorMode: mode },
          style: {
            ...s.style,
            template: { ...s.style.template, textColorMode: mode, preset: 'custom' },
          },
        };
      }),

    setCollageSlot: (slideIndex, slot, photoId) =>
      set((state) => {
        const slide = state.slides[slideIndex];
        if (!slide) return {};
        const collage = normalizeCollage(slide.collage50);
        const prevSlot = collage[slot];
        const nextSlot: CollageSlot = photoId
          ? {
              photoId,
              transform:
                prevSlot.photoId === photoId
                  ? { ...prevSlot.transform }
                  : createDefaultTransform(),
            }
          : { photoId: undefined, transform: createDefaultTransform() };

        const changed =
          prevSlot.photoId !== nextSlot.photoId ||
          prevSlot.transform.scale !== nextSlot.transform.scale ||
          prevSlot.transform.offsetX !== nextSlot.transform.offsetX ||
          prevSlot.transform.offsetY !== nextSlot.transform.offsetY ||
          slide.template !== 'collage-50';

        if (!changed) return {};

        const nextCollage: Collage50 = { ...collage, [slot]: nextSlot };
        const slides = [...state.slides];
        slides[slideIndex] = {
          ...slide,
          template: 'collage-50',
          collage50: nextCollage,
          image: undefined,
          photoId: undefined,
        };
        return { slides };
      }),

    swapCollage: (slideIndex) =>
      set((state) => {
        const slide = state.slides[slideIndex];
        if (!slide) return {};
        const collage = normalizeCollage(slide.collage50);
        const slotsEqual = collage.top.photoId === collage.bottom.photoId;
        if (slotsEqual) return {};
        const nextCollage: Collage50 = {
          ...collage,
          top: { ...collage.top, photoId: collage.bottom.photoId },
          bottom: { ...collage.bottom, photoId: collage.top.photoId },
        };
        const slides = [...state.slides];
        slides[slideIndex] = {
          ...slide,
          template: 'collage-50',
          collage50: nextCollage,
          image: undefined,
          photoId: undefined,
        };
        return { slides };
      }),

    setTransform: (slideIndex, slot, transform) =>
      set((state) => {
        const slide = state.slides[slideIndex];
        if (!slide) return {};
        if (slot === 'single') {
          const single = normalizeSingle(slide.single);
          const nextTransform: PhotoTransform = {
            scale: transform.scale ?? single.transform.scale,
            offsetX: transform.offsetX ?? single.transform.offsetX,
            offsetY: transform.offsetY ?? single.transform.offsetY,
          };
          const changed =
            nextTransform.scale !== single.transform.scale ||
            nextTransform.offsetX !== single.transform.offsetX ||
            nextTransform.offsetY !== single.transform.offsetY;
          if (!changed) return {};
          const slides = [...state.slides];
          slides[slideIndex] = {
            ...slide,
            single: { transform: nextTransform },
          };
          return { slides };
        }

        if (slot !== 'top' && slot !== 'bottom') {
          return {};
        }

        const collage = normalizeCollage(slide.collage50);
        const currentSlot = collage[slot];
        const nextTransform: PhotoTransform = {
          scale: transform.scale ?? currentSlot.transform.scale,
          offsetX: transform.offsetX ?? currentSlot.transform.offsetX,
          offsetY: transform.offsetY ?? currentSlot.transform.offsetY,
        };
        const changed =
          nextTransform.scale !== currentSlot.transform.scale ||
          nextTransform.offsetX !== currentSlot.transform.offsetX ||
          nextTransform.offsetY !== currentSlot.transform.offsetY;
        if (!changed) return {};
        const slides = [...state.slides];
        slides[slideIndex] = {
          ...slide,
          template: 'collage-50',
          collage50: { ...collage, [slot]: { ...currentSlot, transform: nextTransform } },
          image: undefined,
          photoId: undefined,
        };
        return { slides };
      }),


    applyCollageTemplateToAll: () =>
      set((state) => {
        let changed = false;
        const slides = state.slides.map((slide) => {
          const collage = normalizeCollage(slide.collage50);
          const sameTemplate = slide.template === 'collage-50';
          const sameTop =
            slide.collage50?.top?.photoId === collage.top.photoId &&
            slide.collage50?.top?.transform?.scale === collage.top.transform.scale &&
            slide.collage50?.top?.transform?.offsetX === collage.top.transform.offsetX &&
            slide.collage50?.top?.transform?.offsetY === collage.top.transform.offsetY;
          const sameBottom =
            slide.collage50?.bottom?.photoId === collage.bottom.photoId &&
            slide.collage50?.bottom?.transform?.scale === collage.bottom.transform.scale &&
            slide.collage50?.bottom?.transform?.offsetX === collage.bottom.transform.offsetX &&
            slide.collage50?.bottom?.transform?.offsetY === collage.bottom.transform.offsetY;
          const sameDivider =
            slide.collage50?.dividerPx === collage.dividerPx &&
            slide.collage50?.dividerColor === collage.dividerColor &&
            slide.collage50?.dividerOpacity === collage.dividerOpacity;
          if (sameTemplate && sameTop && sameBottom && sameDivider) {
            return slide;
          }
          changed = true;
          return {
            ...slide,
            template: 'collage-50',
            collage50: collage,
            image: undefined,
            photoId: undefined,
          };
        });
        return changed ? { slides } : {};
      }),

    autoFillCollage: (photoIds) =>
      set((state) => {
        if (photoIds.length === 0) return {};
        const maxSlides = state.slides.length;
        if (maxSlides === 0) return {};
        let changed = false;
        const queue = photoIds.slice(0, maxSlides * 2);
        const slides = state.slides.map((slide, index) => {
          if (index >= maxSlides) return slide;
          const collage = normalizeCollage(slide.collage50);
          const topId = queue[index * 2];
          const bottomId = queue[index * 2 + 1];
          const nextTop: CollageSlot = topId
            ? {
                photoId: topId,
                transform:
                  collage.top.photoId === topId
                    ? { ...collage.top.transform }
                    : createDefaultTransform(),
              }
            : createDefaultCollageSlot();
          const nextBottom: CollageSlot = bottomId
            ? {
                photoId: bottomId,
                transform:
                  collage.bottom.photoId === bottomId
                    ? { ...collage.bottom.transform }
                    : createDefaultTransform(),
              }
            : createDefaultCollageSlot();
          const sameTop =
            collage.top.photoId === nextTop.photoId &&
            collage.top.transform.scale === nextTop.transform.scale &&
            collage.top.transform.offsetX === nextTop.transform.offsetX &&
            collage.top.transform.offsetY === nextTop.transform.offsetY;
          const sameBottom =
            collage.bottom.photoId === nextBottom.photoId &&
            collage.bottom.transform.scale === nextBottom.transform.scale &&
            collage.bottom.transform.offsetX === nextBottom.transform.offsetX &&
            collage.bottom.transform.offsetY === nextBottom.transform.offsetY;
          if (sameTop && sameBottom && slide.template === 'collage-50') {
            return slide;
          }
          changed = true;
          return {
            ...slide,
            template: 'collage-50',
            collage50: { ...collage, top: nextTop, bottom: nextBottom },
            image: undefined,
            photoId: undefined,
          };
        });
        return changed ? { slides } : {};
      }),

      };
    },
    {
      name: 'carousel-state-v1',
      version: 1,
      storage: carouselStorage(),
      partialize: (state) => ({
        slides: state.slides,
        activeIndex: state.activeIndex,
        activeSheet: state.activeSheet,
        text: state.text,
        templateStyle: state.templateStyle,
        typography: state.typography,
        style: state.style,
      }),
      onRehydrateStorage: () => () => {
        if (!carouselStoreApi) return;
        const currentState = carouselStoreApi.getState();
        const slides = currentState.slides;
        if (!slides || slides.length === 0) {
          carouselStoreApi.setState({ slides: [createEmptySlide()], activeIndex: 0 });
          return;
        }
        const trimmed = getExportSlides(slides);
        if (trimmed.length !== slides.length) {
          carouselStoreApi.setState((state) => ({
            slides: trimmed,
            activeIndex: Math.max(0, Math.min(state.activeIndex, trimmed.length - 1)),
          }));
        }
      },
      merge: (persistedState, currentState) => {
        const data = persistedState as Partial<State>;
        const slides = data.slides?.map((slide) => ({
          ...slide,
          single: normalizeSingle(slide.single),
          collage50: slide.collage50 ? normalizeCollage(slide.collage50) : undefined,
        }));
        return {
          ...currentState,
          ...data,
          slides: slides ?? currentState.slides,
        };
      },
    },
  ),
);

export const slidesActions = {
  replaceWithPhotos(photos: Photo[]) {
    useCarouselStore.setState((state) => {
      const next: Slide[] = photos.map((p) => ({
        id: uid(),
        image: p.src,
        photoId: p.id,
        template: 'single',
        single: createDefaultSingle(),
        body: '',
        nickname: state.text?.nickname ?? '',
        kind: 'photo',
      }));

      return { slides: next, activeIndex: 0 };
    });
  },
};
