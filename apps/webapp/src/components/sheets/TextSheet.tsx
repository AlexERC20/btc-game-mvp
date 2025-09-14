import { useState } from 'react';
import { useCarouselStore } from '@/state/store';
import Sheet from '../Sheet/Sheet';

export default function TextSheet(){
  const { slides, activeIndex, updateSlide, closeSheet } = useCarouselStore();
  const active = slides[activeIndex];
  const [val, setVal] = useState(active?.body ?? '');

  return (
    <Sheet title="Text">
      <div className="field">
        <textarea value={val} onChange={e=>setVal(e.target.value)} placeholder="Вставь текст сюда…" />
      </div>
      <div className="sheet__footer">
        <button className="btn" onClick={()=>{ if(active) updateSlide(active.id,{ body: val }); closeSheet(); }}>
          Done
        </button>
      </div>
    </Sheet>
  );
}
