import { useMemo } from 'react';
import { Slide, useCarouselStore, useLayoutSelector } from '@/state/store';
import { resolveSlideDesign } from '@/styles/theme';
import { SlideCard } from './SlideCard';
import { getExportSlides } from '@/utils/getExportSlides';

export function PreviewCarousel({ slides }: { slides: Slide[] }) {
  const baseTemplate = useCarouselStore((s) => s.style.template);
  const typographySettings = useCarouselStore((s) => s.typography);
  const activeIndex = useCarouselStore((s) => s.activeIndex);
  const layout = useLayoutSelector((state) => ({
    text: state.text,
    vOffset: state.vOffset,
    paragraphGap: state.paragraphGap,
    cornerRadius: state.cornerRadius,
    fontSize: state.fontSize,
    nickname: state.nickname,
    textShadow: state.textShadow,
    gradientIntensity: state.gradientIntensity,
  }));

  const visibleSlides = useMemo(() => {
    const trimmed = getExportSlides(slides);
    if (slides.length === 0) {
      return trimmed;
    }
    const maxLength = Math.max(trimmed.length, activeIndex + 1);
    const safeLength = Math.min(slides.length, maxLength);
    return slides.slice(0, safeLength);
  }, [slides, activeIndex]);

  return (
    <div className="carousel">
      {visibleSlides.map((s, i) => (
        <div className="slide" key={s.id ?? i}>
          <SlideCard
            slide={s}
            design={resolveSlideDesign({
              slide: s,
              baseTemplate,
              baseLayout: layout,
              typographySettings,
            })}
            safeAreaEnabled={layout.text.safeArea}
            slideIndex={i}
          />
        </div>
      ))}
    </div>
  );
}
