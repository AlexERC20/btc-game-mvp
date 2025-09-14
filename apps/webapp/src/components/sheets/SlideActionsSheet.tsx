import React from 'react';
import { useCarouselStore } from '@/state/store';
import '../../styles/bottom-sheet.css';

export default function SlideActionsSheet() {
  const {
    activeIndex,
    slides,
    reorderSlides,
    closeSheet,
    setSlides,
    setActiveIndex,
  } = useCarouselStore();

  const onDelete = () => {
    const arr = slides.filter((_, i) => i !== activeIndex);
    setSlides(arr);
    setActiveIndex(Math.max(0, activeIndex - 1));
    closeSheet();
  };

  const move = (dir: -1 | 1) => {
    const from = activeIndex;
    const to = Math.min(slides.length - 1, Math.max(0, from + dir));
    if (to !== from) reorderSlides(from, to);
    closeSheet();
  };

  return (
    <div className="sheet">
      <div className="sheet__title">Slide actions</div>
      <div className="sheet__group">
        <button className="btn btn--danger" onClick={onDelete}>Delete slide</button>
        <button className="btn" onClick={() => move(-1)}>Move left</button>
        <button className="btn" onClick={() => move(1)}>Move right</button>
      </div>
    </div>
  );
}

