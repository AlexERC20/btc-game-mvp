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
};

export type UISheet = null | 'template' | 'layout' | 'photos' | 'text';

type State = {
  slides: Slide[];
  activeIndex: number;
  activeSheet: UISheet;

  openSheet: (s: Exclude<UISheet, null>) => void;
  closeSheet: () => void;

  addSlide: (s?: Partial<Slide>) => void;
  removeSlide: (id: string) => void;
  updateSlide: (id: string, patch: Partial<Slide>) => void;
  reorderSlides: (from: number, to: number) => void;
  setActiveIndex: (i: number) => void;
};

// дефолтный сет мотивации (5 слайдов)
const initial: Slide[] = Array.from({ length: 5 }).map((_, i) => ({
  id: `s${i + 1}`,
  body: `Текст ${i + 1} ...`,
}));

export const useCarouselStore = create<State>((set, get) => ({
  slides: initial,
  activeIndex: 0,
  activeSheet: null,

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
}));

const uid = () => crypto.randomUUID();

export const slidesActions = {
  syncWithPhotos(photos: Photo[]) {
    useCarouselStore.setState((state) => {
      const prev = state.slides;
      const photoSlides = prev.filter((s) => s.photoId);
      const otherSlides = prev.filter((s) => !s.photoId);
      const byPhotoId = new Map(photoSlides.map((s) => [s.photoId!, s]));

      const nextPhotoSlides: Slide[] = photos.map((p) => {
        const keep = byPhotoId.get(p.id);
        return keep
          ? { ...keep, image: p.src }
          : { id: uid(), image: p.src, photoId: p.id };
      });

      return { slides: [...nextPhotoSlides, ...otherSlides] };
    });
  },
};
