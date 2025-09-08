import React from 'react';
import { useStore } from '../state/store';
import SlidePreview from './SlidePreview';
import type { Slide } from '../types';
import { CanvasMode } from '../core/constants';

export default function PreviewRail() {
  const slides = useStore(s=>s.slides);
  const defaults = useStore(s=>s.defaults);
  const reorder = useStore(s=>s.reorderSlides);

  const handleDragStart = (idx:number) => (e:React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDrop = (idx:number) => (e:React.DragEvent) => {
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(from)) {
      reorder(from, idx);
    }
  };
  const handleDragOver = (e:React.DragEvent) => e.preventDefault();

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {slides.map((s:Slide, i:number) => {
        const effFontSize = s.overrides?.fontSize ?? defaults.fontSize;
        const effLH = s.overrides?.lineHeight ?? defaults.lineHeight;
        const effPos = s.overrides?.textPosition ?? defaults.textPosition;
        return (
          <div key={s.id} draggable onDragStart={handleDragStart(i)} onDrop={handleDrop(i)} onDragOver={handleDragOver}>
            <SlidePreview
              slide={s}
              index={i}
              total={slides.length}
              textPosition={effPos}
              username="username"
              theme={'photo'}
              fontSize={effFontSize}
              lineHeight={effLH}
              color={defaults.bodyColor}
              mode={CanvasMode.story}
            />
          </div>
        );
      })}
    </div>
  );
}
