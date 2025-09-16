import { Slide, useCarouselStore, useLayoutSelector } from '@/state/store';
import { resolveSlideDesign } from '@/styles/theme';
import { SlideCard } from './SlideCard';

export function PreviewCarousel({ slides }: { slides: Slide[] }) {
  const baseTemplate = useCarouselStore((s) => s.style.template);
  const typographySettings = useCarouselStore((s) => s.typography);
  const layout = useLayoutSelector((state) => ({
    vertical: state.vertical,
    vOffset: state.vOffset,
    horizontal: state.horizontal,
    useSafeArea: state.useSafeArea,
    blockWidth: state.blockWidth,
    padding: state.padding,
    maxLines: state.maxLines,
    overflow: state.overflow,
    paragraphGap: state.paragraphGap,
    cornerRadius: state.cornerRadius,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    nickname: state.nickname,
    textShadow: state.textShadow,
    gradientIntensity: state.gradientIntensity,
  }));

  return (
    <div className="carousel">
      {slides.map((s, i) => (
        <div className="slide" key={s.id ?? i}>
          <SlideCard
            slide={s}
            design={resolveSlideDesign({
              slide: s,
              baseTemplate,
              baseLayout: layout,
              typographySettings,
            })}
            safeAreaEnabled={layout.useSafeArea}
          />
        </div>
      ))}
    </div>
  );
}
