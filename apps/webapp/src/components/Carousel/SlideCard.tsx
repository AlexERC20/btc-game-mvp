import { Slide, useCarouselStore } from '@/state/store';
import { useRef, useState } from 'react';

export default function SlideCard({ slide, index, active }: { slide: Slide; index: number; active: boolean }){
  const { removeSlide, reorderSlides } = useCarouselStore();
  const [showActions,setShowActions] = useState(false);
  const startY = useRef(0);

  const onTouchStart = (e:React.TouchEvent)=>{ startY.current = e.touches[0].clientY; setShowActions(false); };
  const onTouchMove = (e:React.TouchEvent)=>{
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 40) setShowActions(true);
  };

  return (
    <div className="card" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
      {slide.image && <img src={slide.image} alt="" className="card__bg"/>}
      {slide.body && <div className="card__text">{slide.body}</div>}
      {showActions && (
        <div className="card__actions">
          <button onClick={()=>reorderSlides(index, index-1)}>Left</button>
          <button onClick={()=>reorderSlides(index, index+1)}>Right</button>
          <button onClick={()=>removeSlide(slide.id)}>Delete</button>
        </div>
      )}
    </div>
  );
}
