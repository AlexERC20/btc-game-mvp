import { useEffect, useRef, useState } from 'react';
import { useCarouselStore } from '@/state/store';
import { SlideCard } from './SlideCard';

const MIN_AR = 0.8; // 4:5
const MAX_AR = 1.91; // 1.91:1

export default function PreviewCarousel(){
  const { slides, setActiveIndex } = useCarouselStore();
  const root = useRef<HTMLDivElement|null>(null);
  const [targetAR, setTargetAR] = useState<number>(1);

  useEffect(() => {
    const url = slides?.[0]?.image;
    if (!url) return;

    const img = new Image();
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      const clamped = Math.max(MIN_AR, Math.min(MAX_AR, r));
      setTargetAR(clamped);
    };
    img.src = url;
  }, [slides?.[0]?.image]);

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
      {slides.map((s) => (
        <div key={s.id} className="slide">
          <SlideCard slide={s} aspect={targetAR} />
        </div>
      ))}
    </div>
  );
}
