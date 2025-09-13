import React, { useState, useEffect } from 'react';
import BottomSheet from '../BottomSheet';
import { useStore } from '@/state/store';
import type { SlideId } from '../../types';

export default function ColorSheet({ open, onClose, currentSlideId }: { open: boolean; onClose: () => void; currentSlideId?: SlideId }) {
  const slide = useStore(s=> s.slides.find(x=>x.id===currentSlideId));
  const updateSlide = useStore(s=>s.updateSlide);
  const defaults = useStore(s=>s.defaults);
  const [title, setTitle] = useState(slide?.title ?? "");
  const [match, setMatch] = useState(slide?.overrides?.matchTitleToBody ?? defaults.matchTitleToBody);
  const [tColor, setTColor] = useState(slide?.overrides?.titleColor ?? defaults.titleColor);

  useEffect(()=>{ if(open && slide){ setTitle(slide.title ?? ""); setMatch(slide.overrides?.matchTitleToBody ?? defaults.matchTitleToBody); setTColor(slide.overrides?.titleColor ?? defaults.titleColor); }},[open, currentSlideId]);

  const apply=()=>{
    if (!slide) return;
    updateSlide(slide.id, {
      title,
      overrides: { matchTitleToBody: match, titleColor: tColor }
    });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Title & Color">
      <Label>Title</Label>
      <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" placeholder="Введите заголовок" />

      <div className="mt-3 flex items-center gap-2">
        <input type="checkbox" checked={match} onChange={e=>setMatch(e.target.checked)} />
        <span className="text-sm text-neutral-300">Заголовок как текст</span>
      </div>

      {!match && (
        <>
          <Label>Title color</Label>
          <div className="flex gap-2">
            {['#FFFFFF','#F5F5F5','#111111','#7C4DFF','#2563EB','#10B981','#F59E0B','#EF4444'].map(c=>(
              <button key={c} onClick={()=>setTColor(c)} className="w-8 h-8 rounded-full border border-white/20" style={{background:c}} />
            ))}
          </div>
        </>
      )}

      <div className="mt-4 flex justify-end">
        <button className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-900" onClick={apply}>Apply</button>
      </div>
    </BottomSheet>
  )
}
const Label=({children}:{children:React.ReactNode})=>(<div className="text-sm text-neutral-400 mt-3 mb-1">{children}</div>);
