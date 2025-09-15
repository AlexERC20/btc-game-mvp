import { Slide, useCarouselStore } from '@/state/store';
import { resolveSlideDesign } from '@/styles/theme';
import { SlideCard } from './SlideCard';

export function PreviewCarousel({ slides }: { slides: Slide[] }) {
  const baseTemplate = useCarouselStore((s) => s.style.template);
  const baseLayout = useCarouselStore((s) => s.style.layout);
  const typographySettings = useCarouselStore((s) => s.typography);

  return (
    <div className="carousel">
      {slides.map((s, i) => (
        <div className="slide" key={s.id ?? i}>
          <SlideCard
            slide={s}
            design={resolveSlideDesign({
              slide: s,
              baseTemplate,
              baseLayout,
              typographySettings,
            })}
          />
        </div>
      ))}
    </div>
  );
}
