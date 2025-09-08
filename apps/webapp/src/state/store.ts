import { create } from 'zustand';
import type { Slide, Defaults, SlideId } from '../types';

export type StoreState = {
  slides: Slide[];
  defaults: Defaults;
  updateDefaults: (partial: Partial<Defaults>) => void;
  updateSlide: (id: SlideId, partial: Partial<Slide> | { overrides: Partial<Slide['overrides']> }) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
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
}));
