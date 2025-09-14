import React, { useState, useEffect } from 'react';
import BottomSheet from '../BottomSheet';
import { useStore } from '@/state/store';
import type { SlideId } from '../../types';

export default function LayoutSheet({ open, onClose, currentSlideId }: { open: boolean; onClose: () => void; currentSlideId?: SlideId }) {
  const defaults = useStore(s => s.defaults);
  const updateDefaults = useStore(s => s.updateDefaults);
  const updateSlide = useStore(s => s.updateSlide);

  const [scope, setScope] = useState<'slide'|'all'>('slide');
  const [fontSize, setFontSize] = useState<number>(defaults.fontSize);
  const [lineHeight, setLineHeight] = useState<number>(defaults.lineHeight);
  const [textPosition, setTextPosition] = useState<'top'|'bottom'>(defaults.textPosition);
  const [fontFamily, setFontFamily] = useState(defaults.fontFamily);
  const [fontWeight, setFontWeight] = useState(defaults.fontWeight);
  const [fontItalic, setFontItalic] = useState(defaults.fontItalic);
  const [fontApplyHeading, setFontApplyHeading] = useState(defaults.fontApplyHeading);
  const [fontApplyBody, setFontApplyBody] = useState(defaults.fontApplyBody);

  useEffect(() => {
    if (!open) return;
    if (scope === 'slide' && currentSlideId) {
      const slide = useStore.getState().slides.find(s => s.id === currentSlideId);
      if (slide?.overrides) {
        setFontSize(slide.overrides.fontSize ?? defaults.fontSize);
        setLineHeight(slide.overrides.lineHeight ?? defaults.lineHeight);
        setTextPosition(slide.overrides.textPosition ?? defaults.textPosition);
        setFontFamily(defaults.fontFamily);
        setFontWeight(defaults.fontWeight);
        setFontItalic(defaults.fontItalic);
        setFontApplyHeading(defaults.fontApplyHeading);
        setFontApplyBody(defaults.fontApplyBody);
      } else {
        setFontSize(defaults.fontSize);
        setLineHeight(defaults.lineHeight);
        setTextPosition(defaults.textPosition);
        setFontFamily(defaults.fontFamily);
        setFontWeight(defaults.fontWeight);
        setFontItalic(defaults.fontItalic);
        setFontApplyHeading(defaults.fontApplyHeading);
        setFontApplyBody(defaults.fontApplyBody);
      }
    } else {
      setFontSize(defaults.fontSize);
      setLineHeight(defaults.lineHeight);
      setTextPosition(defaults.textPosition);
      setFontFamily(defaults.fontFamily);
      setFontWeight(defaults.fontWeight);
      setFontItalic(defaults.fontItalic);
      setFontApplyHeading(defaults.fontApplyHeading);
      setFontApplyBody(defaults.fontApplyBody);
    }
  }, [open, scope, currentSlideId, defaults]);

  const apply = () => {
    if (scope === 'all') {
      updateDefaults({ fontSize, lineHeight, textPosition, fontFamily, fontWeight, fontItalic, fontApplyHeading, fontApplyBody });
    } else if (currentSlideId) {
      updateSlide(currentSlideId, { overrides: { fontSize, lineHeight, textPosition } });
    }
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Layout">
      {/* scope */}
      <div className="flex gap-2 mb-3">
        <button className={btn(scope==='slide')} onClick={()=>setScope('slide')}>This slide</button>
        <button className={btn(scope==='all')} onClick={()=>setScope('all')}>All slides</button>
      </div>

      {/* sliders */}
      <Label>Text size: {Math.round(fontSize)}px</Label>
      <input type="range" min={36} max={64} step={1} value={fontSize} onChange={e=>setFontSize(+e.target.value)} />

      <Label>Line height: {lineHeight.toFixed(2)}</Label>
      <input type="range" min={1.10} max={1.60} step={0.02} value={lineHeight} onChange={e=>setLineHeight(+e.target.value)} />

      <Label>Text position</Label>
      <div className="flex gap-2">
        <button className={btn(textPosition==='bottom')} onClick={()=>setTextPosition('bottom')}>Bottom</button>
        <button className={btn(textPosition==='top')} onClick={()=>setTextPosition('top')}>Top</button>
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-700">
        <Label>Font family</Label>
        <select
          className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800"
          value={fontFamily}
          onChange={e=>setFontFamily(e.target.value)}
        >
          <option value="Inter">Inter</option>
          <option value="Manrope">Manrope</option>
          <option value="Montserrat">Montserrat</option>
          <option value="SF Pro">SF Pro</option>
        </select>

        <Label>Weight</Label>
        <input type="range" min={300} max={900} step={50} value={fontWeight} onChange={e=>setFontWeight(+e.target.value)} />

        <div className="mt-2 flex items-center gap-2">
          <input type="checkbox" checked={fontItalic} onChange={e=>setFontItalic(e.target.checked)} />
          <span className="text-sm text-neutral-300">Italic</span>
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={fontApplyHeading} onChange={e=>setFontApplyHeading(e.target.checked)} />
            <span className="text-sm text-neutral-300">Heading</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={fontApplyBody} onChange={e=>setFontApplyBody(e.target.checked)} />
            <span className="text-sm text-neutral-300">Body</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-900" onClick={apply}>Apply</button>
      </div>
    </BottomSheet>
  );
}

const Label = ({children}:{children:React.ReactNode}) => (
  <div className="text-sm text-neutral-400 mt-3 mb-1">{children}</div>
);
const btn = (active:boolean) => `px-3 py-1.5 rounded-lg border ${active?'bg-neutral-800 border-neutral-700':'bg-neutral-900 border-neutral-800'}`;
