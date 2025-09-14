import React, { useRef, useState } from 'react';
import { useCarouselStore } from '@/state/store';
import type { Slide } from '@/types';
import SlidePreview from './SlidePreview';
import SlideActions from './SlideActions';

export default function SlideCard({ slide, index }: { slide: Slide; index: number }){
  const slides = useCarouselStore(s=>s.slides);
  const setSlides = useCarouselStore(s=>s.setSlides);
  const reorderSlides = useCarouselStore(s=>s.reorderSlides);
  const [showActions, setShowActions] = useState(false);
  const startY = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 40) setShowActions(true);
  };
  const onTouchEnd = () => { startY.current = 0; };

  const onDelete = () => setSlides(slides.filter(s=>s.id!==slide.id));
  const onLeft = () => reorderSlides(index, index-1);
  const onRight = () => reorderSlides(index, index+1);

  return (
    <div className="slide-card" style={{position:'relative'}} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <SlidePreview slide={slide} />
      {showActions && (
        <SlideActions onDelete={onDelete} onLeft={onLeft} onRight={onRight} onClose={()=>setShowActions(false)} />
      )}
    </div>
  );
}
