import { create } from 'zustand';
import type { Slide, Defaults, SlideId } from '../types';
import type { Story } from '@/core/story';

/**
 * ВАЖНО: используйте ВЕЗДЕ один и тот же путь импорта стора — '@/state/store'.
 * Смешивание относительных путей ('../state/store') может создать второй инстанс Zustand.
 */

export type FrameSpec = {
  width: number;
  height: number;
  paddingX: number;
  paddingTop: number;
  paddingBottom: number;
  safeNickname: number;
  safePagination: number;
};

const FRAME_SPECS: Record<'story' | 'carousel', FrameSpec> = {
  story: {
    width: 1080,
    height: 1920,
    paddingX: 72,
    paddingTop: 72,
    paddingBottom: 72,
    safeNickname: 120,
    safePagination: 120,
  },
  carousel: {
    width: 1080,
    height: 1350,
    paddingX: 72,
    paddingTop: 72,
    paddingBottom: 72,
    safeNickname: 120,
    safePagination: 120,
  },
};

export type UISheet =
  | null
  | 'export'
  | 'text'
  | 'template'
  | 'layout'
  | 'photos'
  | 'slideActions';

export type StoreState = {
  /** Сырые слайды — ИСТИНА для UI и экспорта */
  slides: Slide[];

  /**
   * УСТАРЕВШЕЕ поле: оставлено для обратной совместимости с компонентами,
   * которые читают store.story. Не используйте для экспорта — вместо этого
   * вызывайте getStory().
   */
  story: Story;

  defaults: Defaults;
  mode: 'story' | 'carousel';
  frame: FrameSpec;

  activeSheet: UISheet;
  activeIndex: number;
  openSheet: (s: Exclude<UISheet, null>) => void;
  closeSheet: () => void;
  setActiveIndex: (i: number) => void;

  updateDefaults: (partial: Partial<Defaults>) => void;

  updateSlide: (
    id: SlideId,
    partial: Partial<Slide> | { overrides: Partial<Slide['overrides']> }
  ) => void;

  reorderSlides: (fromIndex: number, toIndex: number) => void;

  setMode: (mode: 'story' | 'carousel') => void;

  setSlides: (slides: Slide[]) => void;
  syncStory: (story: Story) => void;
};

const DEFAULT_TEXTS = [
  'Текст 1 ...',
  'Текст 2 ...',
  'Текст 3 ...',
  'Текст 4 ...',
  'Текст 5 ...',
];

function makeDefaultSlides(): Slide[] {
  return DEFAULT_TEXTS.map((t, i) => ({ id: `def-${i + 1}`, body: t, nickname: '' }));
}

const initialSlides: Slide[] = makeDefaultSlides();

const createStore = () => create<StoreState>((set) => ({
  slides: initialSlides,
  story: { slides: initialSlides }, // не используется для экспорта; поддерживается для совместимости
  defaults: {
    fontSize: 44,
    lineHeight: 1.28,
    textPosition: 'bottom',
    bodyColor: '#FFFFFF',
    titleColor: '#FFFFFF',
    matchTitleToBody: true,
    fontFamily: 'Inter',
    fontWeight: 600,
    fontItalic: false,
    fontApplyHeading: true,
    fontApplyBody: true,
  },
  mode: 'story',
  frame: FRAME_SPECS.story,

  activeSheet: null,
  activeIndex: 0,
  openSheet: (s) => set({ activeSheet: s }),
  closeSheet: () => set({ activeSheet: null }),
  setActiveIndex: (i) => set({ activeIndex: i }),

  updateDefaults: (partial) =>
    set((state) => ({
      defaults: { ...state.defaults, ...partial },
      // story здесь целенаправленно не трогаем, т.к. story собирается через getStory()
    })),

  updateSlide: (id, partial) =>
    set((state) => {
      const slides = state.slides.map((s) => {
        if (s.id !== id) return s;
        if ('overrides' in partial) {
          return { ...s, overrides: { ...s.overrides, ...(partial as any).overrides } };
        }
        return { ...s, ...partial };
      });
      return {
        slides,
        story: { slides }, // для обратной совместимости
      };
    }),

  reorderSlides: (fromIndex, toIndex) =>
    set((state) => {
      const slides = [...state.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      return {
        slides,
        story: { slides }, // для обратной совместимости
      };
    }),

  setSlides: (slides) => set({ slides, story: { slides } }),
  syncStory: (story) => set({ story, slides: story?.slides ?? [] }),

  setMode: (mode) =>
    set(() => ({
      mode,
      frame: FRAME_SPECS[mode],
      // story не меняем — getStory() сам возьмет актуальные slides/mode/frame
    })),
}));

export const useCarouselStore = (window as any).__CAROUSEL_STORE__ ?? ((window as any).__CAROUSEL_STORE__ = createStore());

export const useStore = useCarouselStore;
export const getState = () => useCarouselStore.getState();
export const getStory = () => getState().story;

export const getSlides = () => useCarouselStore.getState().slides;
export const getSlidesCount = () => (useCarouselStore.getState().slides?.length ?? 0);

// Для экспорта всегда строим "актуальную story" из текущих slides
export const buildCurrentStory = (): Story => {
  const slides = getSlides();
  return { slides: Array.isArray(slides) ? slides : [] } as Story;
};

