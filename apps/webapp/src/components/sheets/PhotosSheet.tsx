import { useRef, useState } from 'react';
import { useCarouselStore } from '@/state/store';
import Sheet from '../Sheet/Sheet';

export default function PhotosSheet(){
  const fileInput = useRef<HTMLInputElement|null>(null);
  const { slides, activeIndex, updateSlide, closeSheet } = useCarouselStore();
  const active = slides[activeIndex];
  const [preview, setPreview] = useState<string|null>(active?.image ?? null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const apply = ()=>{
    if (active && preview) updateSlide(active.id, { image: preview });
    closeSheet();
  };

  return (
    <Sheet title="Photos">
      <input ref={fileInput} type="file" accept="image/*" style={{display:'none'}} onChange={onPick}/>
      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <button className="btn" onClick={()=>fileInput.current?.click()}>Add photo</button>
        <button className="btn" onClick={apply}>Done</button>
      </div>
      {preview && <img src={preview} alt="" style={{width:'100%', borderRadius:12}}/>}
    </Sheet>
  );
}
