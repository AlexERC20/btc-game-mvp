import { useEffect, useRef } from 'react';
import { useCarouselStore } from '@/state/store';
import SlideCard from './SlideCard';

export default function PreviewCarousel(){
  const { slides, activeIndex, setActiveIndex } = useCarouselStore();
  const root = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    const el = root.current!;
    if (!el) return;
    const onScroll = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const r = (c as HTMLElement).getBoundingClientRect();
        const mid = r.left + r.width/2 - el.getBoundingClientRect().left + el.scrollLeft;
        const d = Math.abs(mid - center);
        if (d < bestDist) { best = i; bestDist = d; }
      });
      setActiveIndex(best);
    };
    el.addEventListener('scroll', onScroll, { passive:true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [setActiveIndex]);

  return (
    <div ref={root} className="carousel">
      {slides.map((s, i)=>(
        <div key={s.id} className="slide" data-active={i===activeIndex}>
          <SlideCard slide={s} index={i} active={i===activeIndex}/>
        </div>
      ))}
    </div>
  );
}
