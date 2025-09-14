import React, { useState } from 'react';
import { useCarouselStore } from '@/state/store';
import Sheet from '../Sheet';

export default function TextSheet(){
  const { slides, activeIndex, updateSlide, closeSheet } = useCarouselStore();
  const active = slides[activeIndex];
  const [value,setValue] = useState(active?.body ?? '');

  return (
    <Sheet title="Text" onClose={closeSheet}>
      <div className="field">
        <textarea value={value} onChange={e=>setValue(e.target.value)} placeholder="Вставь текст сюда…" />
      </div>
      <div className="sheet__footer">
        <button className="btn" onClick={()=>{ if(active) updateSlide(active.id,{ body:value }); closeSheet(); }}>Done</button>
      </div>
    </Sheet>
  );
}
