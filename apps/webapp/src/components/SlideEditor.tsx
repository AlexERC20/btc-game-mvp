import React, { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import { useStore } from '@/state/store';
import type { SlideId } from '../types';

export default function SlideEditor({ open, onClose, currentSlideId }: { open: boolean; onClose: () => void; currentSlideId?: SlideId }) {
  const slide = useStore(s=> s.slides.find(x=>x.id===currentSlideId));
  const updateSlide = useStore(s=>s.updateSlide);
  const defaults = useStore(s=>s.defaults);

  const [title, setTitle] = useState('');
  const [match, setMatch] = useState(defaults.matchTitleToBody);
  const [tColor, setTColor] = useState(defaults.titleColor);
  const [fontSize, setFontSize] = useState(defaults.fontSize);
  const [lineHeight, setLineHeight] = useState(defaults.lineHeight);
  const [textPosition, setTextPosition] = useState<'top'|'bottom'>(defaults.textPosition);

  useEffect(()=>{
    if(open && slide){
      setTitle(slide.title ?? '');
      setMatch(slide.overrides?.matchTitleToBody ?? defaults.matchTitleToBody);
      setTColor(slide.overrides?.titleColor ?? defaults.titleColor);
      setFontSize(slide.overrides?.fontSize ?? defaults.fontSize);
      setLineHeight(slide.overrides?.lineHeight ?? defaults.lineHeight);
      setTextPosition(slide.overrides?.textPosition ?? defaults.textPosition);
    }
  },[open, currentSlideId]);

  const apply=()=>{
    if(!slide) return;
    updateSlide(slide.id, {
      title,
      overrides:{
        matchTitleToBody: match,
        titleColor: tColor,
        fontSize,
        lineHeight,
        textPosition,
      }
    });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit slide">
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

      <Label>Text size: {Math.round(fontSize)}px</Label>
      <input type="range" min={36} max={64} step={1} value={fontSize} onChange={e=>setFontSize(+e.target.value)} />

      <Label>Line height: {lineHeight.toFixed(2)}</Label>
      <input type="range" min={1.10} max={1.60} step={0.02} value={lineHeight} onChange={e=>setLineHeight(+e.target.value)} />

      <Label>Text position</Label>
      <div className="flex gap-2">
        <button className={btn(textPosition==='bottom')} onClick={()=>setTextPosition('bottom')}>Bottom</button>
        <button className={btn(textPosition==='top')} onClick={()=>setTextPosition('top')}>Top</button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-100" onClick={onClose}>Cancel</button>
        <button className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-900" onClick={apply}>Apply</button>
      </div>
    </BottomSheet>
  );
}

const Label = ({children}:{children:React.ReactNode}) => (
  <div className="text-sm text-neutral-400 mt-3 mb-1">{children}</div>
);
const btn = (active:boolean) => `px-3 py-1.5 rounded-lg border ${active?'bg-neutral-800 border-neutral-700':'bg-neutral-900 border-neutral-800'}`;
