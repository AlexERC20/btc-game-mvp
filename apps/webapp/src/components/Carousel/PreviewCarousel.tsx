import { Slide } from '@/state/store';
import { SlideCard } from './SlideCard';

const TARGET_AR = 0.8; // 4:5 — единый для всех

export function PreviewCarousel({ slides }: { slides: Slide[] }) {
  return (
    <div className="carousel">
      {slides.map((s, i) => (
        <div className="slide" key={s.id ?? i}>
          <SlideCard slide={s} aspect={TARGET_AR} />
        </div>
      ))}
    </div>
  );
}
