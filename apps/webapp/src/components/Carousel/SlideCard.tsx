import { Slide } from '@/state/store';
import type { SlideDesign } from '@/styles/theme';
import { splitEditorialText } from '@/utils/text';

type Props = {
  slide: Slide;
  aspect: number;
  design: SlideDesign;
};

export function SlideCard({ slide, aspect, design }: Props) {
  const { theme, typography, layout, template } = design;
  const { title, body } = splitEditorialText(slide.body || '');
  const gradientHeight = Math.max(0, Math.min(theme.gradientStops.heightPct, 1));
  const gradientPercent = Number((gradientHeight * 100).toFixed(2));
  const overlayOffset = Math.max(theme.padding.x - layout.padding, 0);
  const overlayBottom = Math.max(theme.padding.y - layout.padding, 0);
  const textShadow = theme.shadow
    ? `0 ${theme.shadow.y}px ${theme.shadow.blur}px ${theme.shadow.color}`
    : undefined;

  return (
    <div className="ig-frame" style={{ aspectRatio: aspect, borderRadius: theme.radius }}>
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
  );
}
