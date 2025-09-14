import { create } from 'zustand';

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

export type Slide = {
  id: string;
  body?: string;
  image?: string; // objectURL или http url
  photoId?: PhotoId;
  nickname?: string;
  overrides?: {
    template?: TemplateStyle;
    layout?: LayoutStyle;
  };
  kind?: 'demo' | 'photo';
  isDemo?: boolean;
};

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

export interface TemplateStyle {
  preset: TemplatePreset;
  textColorMode: 'auto' | 'white' | 'black';
  accent: string;
  gradient: number;
  dim: number;
  textShadow: 0 | 1 | 2 | 3;
  showNickname: boolean;
  nicknameStyle: 'pill' | 'tag';
  font: 'system' | 'inter' | 'playfair' | 'bodoni' | 'dmsans';
}

export interface LayoutStyle {
  vPos: 'top' | 'middle' | 'bottom';
  vOffset: number;
  hAlign: 'left' | 'center' | 'right';
  fontSize: number;
  lineHeight: number;
  blockWidth: number;
  padding: number;
  maxLines: number;
  paraGap: number;
  overflow: 'wrap' | 'fade';
  nickPos: 'left' | 'center' | 'right';
  nickOffset: number;
  nickSize: 's' | 'm' | 'l';
  nickOpacity: number;
  nickRadius: number;
  textShadow: 0 | 1 | 2 | 3;
  gradient: number;
}

type ApplyScope = 'all' | 'current';

type State = {
  slides: Slide[];
  activeIndex: number;
  activeSheet: UISheet;
  text: TextState;
  style: {
    template: TemplateStyle;
    layout: LayoutStyle;
    templateScope: ApplyScope;
    layoutScope: ApplyScope;
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

  setTemplatePreset: (p: Exclude<TemplatePreset, 'custom'>) => void;
  setTemplate: (patch: Partial<TemplateStyle>) => void;
  resetTemplate: () => void;
  setTemplateScope: (s: ApplyScope) => void;
  applyTemplate: () => void;

  setLayout: (patch: Partial<LayoutStyle>) => void;
  resetLayout: () => void;
  setLayoutScope: (s: ApplyScope) => void;
  applyLayout: () => void;
};

const editorialTemplate: TemplateStyle = {
  preset: 'editorial',
  textColorMode: 'white',
  accent: '#FFFFFF',
  gradient: 28,
  dim: 6,
  textShadow: 1,
  showNickname: true,
  nicknameStyle: 'pill',
  font: 'inter',
};

const minimalTemplate: TemplateStyle = {
  preset: 'minimal',
  textColorMode: 'auto',
  accent: '#FFFFFF',
  gradient: 0,
  dim: 0,
  textShadow: 0,
  showNickname: true,
  nicknameStyle: 'pill',
  font: 'system',
};

const templatePresets: Record<Exclude<TemplatePreset, 'custom'>, TemplateStyle> = {
  editorial: editorialTemplate,
  minimal: minimalTemplate,
  light: { ...minimalTemplate, preset: 'light', gradient: 30, textShadow: 1, textColorMode: 'white' },
  focus: { ...minimalTemplate, preset: 'focus', gradient: 20, dim: 15, textShadow: 2, textColorMode: 'white' },
  quote: { ...minimalTemplate, preset: 'quote', gradient: 35, dim: 10, textShadow: 2, textColorMode: 'white' },
};

const defaultTemplate = editorialTemplate;

const defaultLayout: LayoutStyle = {
  vPos: 'bottom',
  vOffset: 0,
  hAlign: 'left',
  fontSize: 18,
  lineHeight: 1.3,
  blockWidth: 88,
  padding: 10,
  maxLines: 5,
  paraGap: 6,
  overflow: 'wrap',
  nickPos: 'left',
  nickOffset: 8,
  nickSize: 's',
  nickOpacity: 80,
  nickRadius: 999,
  textShadow: 0,
  gradient: 0,
};

// дефолтный сет мотивации (5 слайдов)
const initial: Slide[] = Array.from({ length: 5 }).map((_, i) => ({
  id: `demo-${i + 1}`,
  body: `Текст ${i + 1} ...`,
  kind: 'demo',
  isDemo: true,
}));

export const useCarouselStore = create<State>((set, get) => ({
  slides: initial,
  activeIndex: 0,
  activeSheet: null,
  text: { nickname: '', bulkText: '' },
  style: {
    template: defaultTemplate,
    layout: defaultLayout,
    templateScope: 'all',
    layoutScope: 'all',
  },

  openSheet: (s) => set({ activeSheet: s }),
  closeSheet: () => set({ activeSheet: null }),

  addSlide: (s = {}) =>
    set((st) => ({ slides: [...st.slides, { id: crypto.randomUUID(), ...s }] })),

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

  setTemplatePreset: (p) =>
    set((s) => ({ style: { ...s.style, template: templatePresets[p] } })),

  setTemplate: (patch) =>
    set((s) => ({
      style: {
        ...s.style,
        template: { ...s.style.template, ...patch, preset: 'custom' },
      },
    })),

  resetTemplate: () => set((s) => ({ style: { ...s.style, template: defaultTemplate } })),

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

  setLayout: (patch) =>
    set((s) => ({ style: { ...s.style, layout: { ...s.style.layout, ...patch } } })),

  resetLayout: () => set((s) => ({ style: { ...s.style, layout: defaultLayout } })),

  setLayoutScope: (sc) =>
    set((s) => ({ style: { ...s.style, layoutScope: sc } })),

  applyLayout: () =>
    set((state) => {
      const { layout, layoutScope } = state.style;
      const slides = state.slides.map((sl, i) => {
        if (layoutScope === 'all' || i === state.activeIndex) {
          return {
            ...sl,
            overrides: { ...sl.overrides, layout },
          };
        }
        return sl;
      });
      return { slides };
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
        body: '',
        nickname: state.text?.nickname ?? '',
        kind: 'photo',
      }));

      return { slides: next, activeIndex: 0 };
    });
  },
};
