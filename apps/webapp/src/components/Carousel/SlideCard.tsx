import React from 'react';
import { Slide } from '@/state/store';

export function SlideCard({
  slide,
  aspect,
}: {
  slide: Slide;
  aspect: number; // приходит из PreviewCarousel
}) {
  return (
    <div className="ig-frame" style={{ aspectRatio: aspect }}>
      {slide.image ? (
        <img src={slide.image} alt="" draggable={false} />
      ) : (
        <div className="ig-placeholder" />
      )}
    </div>
  );
}

