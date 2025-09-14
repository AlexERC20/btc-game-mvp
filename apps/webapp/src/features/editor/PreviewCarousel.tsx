import React, { UIEvent, useRef } from 'react';
import { useCarouselStore } from '@/state/store';
import BottomBar from '@/components/BottomBar';
import { TextSheet, LayoutSheet, PhotosSheet } from '@/components/sheets';
import SlideCard from '@/components/SlideCard';
import Sheet from '@/components/Sheet';
import '@/styles/carousel.css';

export default function PreviewCarousel(){
  const slides = useCarouselStore(s=>s.slides);
  const activeIndex = useCarouselStore(s=>s.activeIndex);
  const setActiveIndex = useCarouselStore(s=>s.setActiveIndex);
  const activeSheet = useCarouselStore(s=>s.activeSheet);
  const closeSheet = useCarouselStore(s=>s.closeSheet);
  const carouselRef = useRef<HTMLDivElement>(null);

  function handleScroll(e: UIEvent<HTMLDivElement>){
    const el = e.currentTarget;
    const center = el.scrollLeft + el.clientWidth/2;
    let best = 0, bestDist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const r = (c as HTMLElement).getBoundingClientRect();
      const mid = r.left + r.width/2 - el.getBoundingClientRect().left + el.scrollLeft;
      const d = Math.abs(mid - center);
      if (d < bestDist){ bestDist = d; best = i; }
    });
    setActiveIndex(best);
  }

  return (
    <>
      <div className="carousel" onScroll={handleScroll} ref={carouselRef}>
        {slides.map((s,i)=>(
          <div key={s.id} className="slide" data-index={i} data-active={i===activeIndex}>
            <SlideCard slide={s} index={i} />
          </div>
        ))}
      </div>
      <BottomBar />
      {activeSheet === 'text' && <TextSheet />}
      {activeSheet === 'template' && <TemplateSheet onClose={closeSheet} />}
      {activeSheet === 'photos' && <PhotosSheet />}
      {activeSheet === 'layout' && (
        <LayoutSheet open={true} onClose={closeSheet} currentSlideId={slides[activeIndex]?.id} />
      )}
    </>
  );
}

function TemplateSheet({ onClose }:{ onClose:()=>void }){
  return <Sheet title="Template" onClose={onClose}></Sheet>;
}
