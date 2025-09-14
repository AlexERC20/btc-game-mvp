import React, { useState, useRef } from 'react';
import { useStore, useCarouselStore } from '@/state/store';
import BottomBar from '../../components/BottomBar';
import LayoutSheet from '../../components/sheets/LayoutSheet';
import PhotosSheet from '../../components/PhotosSheet';
import TextSheet from '../../components/sheets/TextSheet';
import SlideQuickActions from '../../components/SlideQuickActions';
import BottomSheet from '../../components/BottomSheet';
import '../../styles/preview-carousel.css';

export default function PreviewCarousel() {
  const slides = useCarouselStore(s => s.slides);
  const activeSheet = useStore(s => s.activeSheet);
  const closeSheet = useStore(s => s.closeSheet);
  const reorderSlides = useStore(s => s.reorderSlides);
  const setSlides = useStore(s => s.setSlides);

  const [index, setIndex] = useState(0);
  const [qaOpen, setQaOpen] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!qaOpen && dy > 22 && Math.abs(dx) < 18) {
      setQaOpen(true);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 40) {
      setIndex(i => Math.min(slides.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))));
    }
    startX.current = startY.current = null;
  };

  const onMoveLeft = () => {
    reorderSlides(index, index - 1);
    setIndex(i => Math.max(0, i - 1));
    setQaOpen(false);
  };
  const onMoveRight = () => {
    reorderSlides(index, index + 1);
    setIndex(i => Math.min(slides.length - 1, i + 1));
    setQaOpen(false);
  };
  const onDelete = () => {
    const arr = slides.filter((_, i) => i !== index);
    setSlides(arr);
    setIndex(i => Math.max(0, Math.min(i, arr.length - 1)));
    setQaOpen(false);
  };

  return (
    <div>
      <div className="carousel" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        {slides.map((s, i) => {
          const d = i - index;
          return (
            <div key={s.id} className="carousel__card" style={{ '--shift': d } as React.CSSProperties}>
              <div className="carousel__content">
                {s.image ? (
                  <img src={s.image} className="w-full h-full object-cover" />
                ) : (
                  <div className="p-4 text-white text-center">{s.body}</div>
                )}
              </div>
            </div>
          );
        })}
        {qaOpen && (
          <SlideQuickActions
            onMoveLeft={onMoveLeft}
            onDelete={onDelete}
            onMoveRight={onMoveRight}
            onClose={() => setQaOpen(false)}
          />
        )}
      </div>
      <BottomBar />
      <TemplateSheet open={activeSheet === 'template'} onClose={closeSheet} />
      <LayoutSheet open={activeSheet === 'layout'} onClose={closeSheet} currentSlideId={slides[index]?.id} />
      <PhotosSheet
        open={activeSheet === 'photos'}
        onClose={closeSheet}
        onDone={closeSheet}
        photos={slides.filter(s => s.image).map(s => ({ id: s.id, url: s.image! }))}
        onAdd={(urls) => {
          const next = urls.map(url => ({ id: Math.random().toString(36).slice(2), body: '', image: url }));
          setSlides([...slides, ...next]);
        }}
        onDelete={(id) => setSlides(slides.filter(s => s.id !== id))}
        onMove={(id, dir) => {
          const idx = slides.findIndex(s => s.id === id);
          if (idx !== -1) reorderSlides(idx, idx + dir);
        }}
      />
      <TextSheet open={activeSheet === 'text'} onClose={closeSheet} currentSlideId={slides[index]?.id} />
    </div>
  );
}

function TemplateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <BottomSheet open={open} onClose={onClose} title="Template" />;
}
