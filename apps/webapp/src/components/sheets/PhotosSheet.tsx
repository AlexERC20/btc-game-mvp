import React, { useRef, useState } from 'react';
import Sheet from '../Sheet';
import { useCarouselStore } from '@/state/store';
import '../../styles/photos-sheet.css';

export default function PhotosSheet(){
  const closeSheet = useCarouselStore(s=>s.closeSheet);
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);

  const onFiles: React.ChangeEventHandler<HTMLInputElement> = e => {
    const files = Array.from(e.target.files ?? []);
    const readers = files.map(f => new Promise<string>(res => {
      const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f);
    }));
    Promise.all(readers).then(urls => setImages(prev => [...prev, ...urls]));
    e.currentTarget.value = '';
  };

  const select = (src: string) => {
    const { slides, activeIndex, updateSlide } = useCarouselStore.getState();
    const active = slides[activeIndex];
    if (!active) return;
    updateSlide(active.id, { image: src });
    closeSheet();
  };

  return (
    <Sheet title="Photos" onClose={closeSheet}>
      <div className="photos-grid">
        {images.map((src,i)=>(
          <img key={i} src={src} onClick={()=>select(src)} />
        ))}
      </div>
      <div className="sheet__footer">
        <button className="btn" onClick={()=>fileRef.current?.click()}>Add</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} />
    </Sheet>
  );
}
