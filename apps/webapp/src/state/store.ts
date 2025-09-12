import { create } from 'zustand';
import type { Slide, Defaults, SlideId } from '../types';
import type { Story } from '@/core/story';

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

export type UISheet = null | 'template' | 'layout' | 'fonts' | 'photos' | 'info';

export type StoreState = {
  slides: Slide[];
  defaults: Defaults;
  mode: 'story' | 'carousel';
  frame: FrameSpec;
  activeSheet: UISheet;
  openSheet: (s: Exclude<UISheet, null>) => void;
  closeSheet: () => void;
  updateDefaults: (partial: Partial<Defaults>) => void;
  updateSlide: (id: SlideId, partial: Partial<Slide> | { overrides: Partial<Slide['overrides']> }) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setMode: (mode: 'story' | 'carousel') => void;
};

export const useStore = create<StoreState>((set) => ({
  slides: [],
  defaults: {
    fontSize: 44,
    lineHeight: 1.28,
    textPosition: 'bottom',
    bodyColor: '#FFFFFF',
    titleColor: '#FFFFFF',
    matchTitleToBody: true,
  },
  mode: 'story',
  frame: FRAME_SPECS.story,
  activeSheet: null,
  openSheet: (s) => set({ activeSheet: s }),
  closeSheet: () => set({ activeSheet: null }),
  updateDefaults: (partial) => set((state) => ({ defaults: { ...state.defaults, ...partial } })),
  updateSlide: (id, partial) => set((state) => ({
    slides: state.slides.map((s) => {
      if (s.id !== id) return s;
      if ('overrides' in partial) {
        return { ...s, overrides: { ...s.overrides, ...(partial as any).overrides } };
      }
      return { ...s, ...partial };
    }),
  })),
  reorderSlides: (fromIndex, toIndex) => set((state) => {
    const slides = [...state.slides];
    const [moved] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, moved);
    return { slides };
  }),
  setMode: (mode) => set(() => ({ mode, frame: FRAME_SPECS[mode] })),
}));

export const getState = () => useStore.getState();

export const useCarouselStore = <T>(
  selector: (s: StoreState & { story: Story }) => T,
): T =>
  useStore((state) =>
    selector({ ...(state as StoreState), story: { slides: state.slides } })
  );
