import { SlideCard } from './SlideCard';

const TARGET_AR = 0.8; // 4:5 — единый для всех

export function PreviewCarousel({ slides }: { slides: { imageUrl?: string }[] }) {
  return (
    <div className="carousel">
      {slides.map((s, i) => (
        <div className="slide" key={i}>
          <SlideCard slide={s} aspect={TARGET_AR} />
        </div>
      ))}
    </div>
  );
}
