import React, { useEffect, useRef } from 'react';
import { useCarouselStore } from '@/state/store';
import BottomBar from '@/components/BottomBar';
import LayoutSheet from '@/components/sheets/LayoutSheet';
import PhotosSheet from '@/components/PhotosSheet';
import SlideActionsSheet from '@/components/sheets/SlideActionsSheet';
import BottomSheet from '@/components/BottomSheet';
import SlidePreview from '@/components/SlidePreview';
import '@/styles/carousel.css';

export default function PreviewCarousel() {
  const slides = useCarouselStore((s) => s.slides);
  const active = useCarouselStore((s) => s.activeIndex);
  const setActive = useCarouselStore((s) => s.setActiveIndex);
  const activeSheet = useCarouselStore((s) => s.activeSheet);
  const closeSheet = useCarouselStore((s) => s.closeSheet);
  const reorderSlides = useCarouselStore((s) => s.reorderSlides);
  const setSlides = useCarouselStore((s) => s.setSlides);

  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = trackRef.current;
    if (!root) return;
    const cards = Array.from(root.children) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      let bestIdx = active, best = 0;
      entries.forEach((e) => {
        const idx = cards.indexOf(e.target as HTMLElement);
        if (e.intersectionRatio > best) {
          best = e.intersectionRatio;
          bestIdx = idx;
        }
      });
      if (best > 0.6) setActive(bestIdx);
    }, { root, threshold: [0.3, 0.6, 0.9] });

    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [slides.length]);

  return (
    <>
      <div className="stage">
        <div ref={trackRef} className="track" role="listbox" aria-label="Slides">
          {slides.map((s, i) => (
            <div
              key={s.id}
              className={`card ${i === active ? 'is-active' : 'is-side'}`}
              role="option"
              aria-selected={i === active}
            >
              <SlidePreview slide={s} />
            </div>
          ))}
        </div>
      </div>
      <BottomBar />

      {activeSheet === 'template' && <TemplateSheet open={true} onClose={closeSheet} />}
      {activeSheet === 'layout' && (
        <LayoutSheet open={true} onClose={closeSheet} currentSlideId={slides[active]?.id} />
      )}
      {activeSheet === 'photos' && (
        <PhotosSheet
          open={true}
          onClose={closeSheet}
          onDone={closeSheet}
          photos={slides.filter((s) => s.image).map((s) => ({ id: s.id, url: s.image! }))}
          onAdd={(urls) => {
            const next = urls.map((url) => ({ id: Math.random().toString(36).slice(2), body: '', image: url, nickname: '' }));
            setSlides([...slides, ...next]);
          }}
          onDelete={(id) => setSlides(slides.filter((s) => s.id !== id))}
          onMove={(id, dir) => {
            const idx = slides.findIndex((s) => s.id === id);
            if (idx !== -1) reorderSlides(idx, idx + dir);
          }}
        />
      )}
      {activeSheet === 'slideActions' && <SlideActionsSheet />}
    </>
  );
}

function TemplateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <BottomSheet open={open} onClose={onClose} title="Template" />;
}

