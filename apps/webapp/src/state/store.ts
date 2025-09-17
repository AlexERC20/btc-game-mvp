import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

export type NicknameLayout = {
  position: 'left' | 'center' | 'right';
  offset: number;
  size: 'S' | 'M' | 'L';
  opacity: number;
};

export type LayoutConfig = {
  vertical: 'top' | 'middle' | 'bottom';
  vOffset: number;
  horizontal: 'left' | 'center' | 'right';
  useSafeArea: boolean;
  blockWidth: number;
  padding: number;
  maxLines: number;
  overflow: 'wrap' | 'fade';
  paragraphGap: number;
  cornerRadius: number;
  fontSize: number;
  lineHeight: number;
  nickname: NicknameLayout;
  textShadow: 0 | 1 | 2 | 3;
  gradientIntensity: number;
};

export type LayoutState = LayoutConfig & {
  set<K extends keyof LayoutConfig>(key: K, val: LayoutConfig[K]): void;
  setNickname<K extends keyof NicknameLayout>(key: K, val: NicknameLayout[K]): void;
  reset(): void;
};

const DEFAULT_LAYOUT: LayoutConfig = {
  vertical: 'bottom',
  vOffset: 0,
  horizontal: 'left',
  useSafeArea: false,
  blockWidth: 0,
  padding: 96,
  maxLines: 8,
  overflow: 'wrap',
  paragraphGap: 24,
  cornerRadius: 48,
  fontSize: 28,
  lineHeight: 1.3,
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
        if (key === 'nickname') {
          set({ nickname: val as NicknameLayout });
          return;
        }
        set({ [key]: val } as Partial<LayoutState>);
      },
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
          nickname: { ...DEFAULT_LAYOUT.nickname },
        }),
    }),
    {
      name: 'layout-settings',
      version: 1,
      storage: layoutStorage(),
      partialize: (state) => ({
        vertical: state.vertical,
        vOffset: state.vOffset,
        horizontal: state.horizontal,
        useSafeArea: state.useSafeArea,
        blockWidth: state.blockWidth,
        padding: state.padding,
        maxLines: state.maxLines,
        overflow: state.overflow,
        paragraphGap: state.paragraphGap,
        cornerRadius: state.cornerRadius,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        nickname: state.nickname,
        textShadow: state.textShadow,
        gradientIntensity: state.gradientIntensity,
      }),
    },
  ),
);

export function layoutSnapshot(): LayoutConfig {
  const { set, setNickname, reset, ...values } = useLayoutStore.getState();
  return values;
}

export const useLayoutSelector = <T,>(selector: (state: LayoutState) => T) =>
  useLayoutStore(selector);

export type Slide = {
  id: string;
  body?: string;
  image?: string; // objectURL или http url
  photoId?: PhotoId;
  template: 'single' | 'collage-50';
  collage50?: Collage50;
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
  setCollageTransform: (
    slideIndex: number,
    slot: 'top' | 'bottom',
    transform: Partial<PhotoTransform>,
  ) => void;
  applyCollageTemplateToAll: () => void;
  autoFillCollage: (photoIds: string[]) => void;
};

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

// дефолтный сет мотивации (10 приветственных слайдов)
const initial: Slide[] = [
  {
    id: 'demo-1',

    body: `Карусель — лучший формат для продвижения.
В Instagram карусели дают до 2 раз больше вовлечения, чем обычные фото или видео. Это прямой способ увеличить охват и подписчиков.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-2',

    body: `Алгоритм показывает карусель дважды.

Если человек не отреагировал на первый слайд, Instagram может показать ему второй. Больше шансов, что тебя заметят.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-3',

    body: `Дольше удерживают внимание.

Каждый свайп = дополнительное время в посте. Алгоритм видит интерес и поднимает публикацию выше в ленте.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-4',

    body: `Больше сохранений = больше охват.

Образовательные или пошаговые карусели сохраняют в 10 раз чаще, чем одиночные посты. Сохранения — главный сигнал для Instagram.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-5',

    body: `Сторителлинг работает лучше.

Карусель = мини-история. От «проблемы» → к «решению» → к «призову к действию». Люди дочитывают до конца и подписываются.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-6',

    body: `5+ слайдов = больше вовлечения.

Карусели с 7–10 слайдами показывают самый высокий engagement rate (до 2 %). Чем длиннее история — тем больше действий.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-7',

    body: `Образовательный контент проще упаковать.

Советы, инструкции, чек-листы — удобнее дать серией свайпов. Это вызывает доверие и делает тебя экспертом в нише.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-8',

    body: `Работает даже лучше, чем Reels.

Средний engagement у каруселей выше, чем у Reels (0.55 % vs 0.50 %). Это значит: не только видео = рост аккаунта.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-9',

    body: `20 слайдов = новый уровень.

Instagram недавно увеличил лимит до 20 фото. Теперь можно делать полноценные гайды прямо в ленте.`,
    kind: 'demo',
    isDemo: true,
  },
  {
    id: 'demo-10',

    body: `Итог — делай больше 5 слайдов.
х
Чем длиннее карусель, тем больше охват, вовлечение и сохранения. 👉 Используй этот формат регулярно, чтобы аккаунт рос быстрее.`,
    kind: 'demo',
    isDemo: true,
  },
].map((slide) => ({
  template: 'single',
  ...slide,
}));

export const useCarouselStore = create<State>((set, get) => ({
  slides: initial,
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
    set((st) => ({
      slides: [
        ...st.slides,
        {
          id: crypto.randomUUID(),
          template: 'single',
          ...s,
        },
      ],
    })),

  removeSlide: (id) =>
    set((st) => ({
      slides: st.slides.filter((x) => x.id !== id),
      activeIndex: Math.min(get().activeIndex, st.slides.length - 2),
    })),

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
      const slotsEqual =
        collage.top.photoId === collage.bottom.photoId &&
        collage.top.transform.scale === collage.bottom.transform.scale &&
        collage.top.transform.offsetX === collage.bottom.transform.offsetX &&
        collage.top.transform.offsetY === collage.bottom.transform.offsetY;
      if (slotsEqual) return {};
      const nextCollage: Collage50 = {
        ...collage,
        top: { photoId: collage.bottom.photoId, transform: { ...collage.bottom.transform } },
        bottom: { photoId: collage.top.photoId, transform: { ...collage.top.transform } },
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

  setCollageTransform: (slideIndex, slot, transform) =>
    set((state) => {
      const slide = state.slides[slideIndex];
      if (!slide) return {};
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
      const maxSlides = Math.min(state.slides.length, 10);
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

}));

const uid = () => crypto.randomUUID();

export const slidesActions = {
  replaceWithPhotos(photos: Photo[]) {
    useCarouselStore.setState((state) => {
      const next: Slide[] = photos.map((p) => ({
        id: uid(),
        image: p.src,
        photoId: p.id,
        template: 'single',
        body: '',
        nickname: state.text?.nickname ?? '',
        kind: 'photo',
      }));

      return { slides: next, activeIndex: 0 };
    });
  },
};
