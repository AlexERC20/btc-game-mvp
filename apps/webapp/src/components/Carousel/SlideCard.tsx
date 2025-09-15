import { useLayoutEffect, useRef, useState } from 'react';
import { BASE_FRAME } from '@/features/render/constants';
import { Slide } from '@/state/store';
import type { SlideDesign } from '@/styles/theme';
import { splitEditorialText } from '@/utils/text';

type Props = {
  slide: Slide;
  design: SlideDesign;
};

export function SlideCard({ slide, design }: Props) {
  const { theme, typography, layout, template } = design;
  const { title, body } = splitEditorialText(slide.body || '');
  const gradientHeight = Math.max(0, Math.min(theme.gradientStops.heightPct, 1));
  const gradientPercent = Number((gradientHeight * 100).toFixed(2));
  const overlayOffset = Math.max(theme.padding.x - layout.padding, 0);
  const overlayBottom = Math.max(theme.padding.y - layout.padding, 0);
  const textShadow = theme.shadow
    ? `0 ${theme.shadow.y}px ${theme.shadow.blur}px ${theme.shadow.color}`
    : undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = (width: number) => {
      if (width <= 0) return;
      const nextScale = width / BASE_FRAME.width;
      setScale((prev) => {
        if (prev !== null && Math.abs(prev - nextScale) < 0.001) return prev;
        return nextScale;
      });
    };

    update(element.clientWidth);

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="slide-card"
      style={{ aspectRatio: `${BASE_FRAME.width} / ${BASE_FRAME.height}` }}
    >
      <div
        className="slide-card__content"
        style={{
          width: BASE_FRAME.width,
          height: BASE_FRAME.height,
          transform: `scale(${scale ?? 1})`,
          transformOrigin: 'top left',
          visibility: scale === null ? 'hidden' : 'visible',
        }}
      >
        <div className="ig-frame" style={{ borderRadius: theme.radius }}>
          {slide.image ? (
            <img src={slide.image} alt="" draggable={false} />
          ) : (
            <div className="ig-placeholder" />
          )}
          {theme.gradient !== 'original' && gradientHeight > 0 && (
            <div
              className="footer-gradient"
              style={{
                background: `linear-gradient(to top, ${theme.gradientStops.to} 0%, ${
                  theme.gradientStops.from
                } ${gradientPercent}%)`,
                height: `${gradientPercent}%`,
              }}
            />
          )}
          {(title || body || slide.nickname) && (
            <div
              className="overlay editorial"
              style={{ left: overlayOffset, right: overlayOffset, bottom: overlayBottom }}
            >
              {(title || body) && (
                <div
                  className="text"
                  style={{ maxWidth: `${layout.blockWidth}%`, padding: layout.padding }}
                >
                  {title && (
                    <div
                      className="title"
                      style={{
                        fontSize: typography.title.fontSize,
                        lineHeight: typography.title.lineHeight,
                        fontFamily: typography.title.fontFamily,
                        fontWeight: typography.title.fontWeight,
                        letterSpacing: typography.title.letterSpacing,
                        color: theme.titleColor ?? theme.textColor,
                        textShadow,
                      }}
                    >
                      {title}
                    </div>
                  )}
                  {body && (
                    <div
                      className="body"
                      style={{
                        marginTop: layout.paraGap,
                        fontSize: typography.body.fontSize,
                        lineHeight: typography.body.lineHeight,
                        fontFamily: typography.body.fontFamily,
                        fontWeight: typography.body.fontWeight,
                        letterSpacing: typography.body.letterSpacing,
                        color: theme.textColor,
                        opacity: 0.92,
                        textShadow,
                      }}
                    >
                      {body}
                    </div>
                  )}
                </div>
              )}
              {slide.nickname && template.showNickname && (
                <div
                  className="nickname"
                  style={{ marginTop: layout.nickOffset, color: theme.textColor }}
                >
                  {slide.nickname}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
