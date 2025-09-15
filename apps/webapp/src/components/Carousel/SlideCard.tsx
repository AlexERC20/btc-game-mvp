import {
  Slide,
  TemplateConfig,
  LayoutStyle,
  useCarouselStore,
  getBaseTextColor,
  getHeadingColor,
} from '@/state/store';

function splitTextEditorial(text: string): { title: string; body: string } {
  const trimmed = text.trim();
  if (!trimmed) return { title: '', body: '' };
  const match = trimmed.match(/[.!?…](?:\s|\n)/);
  if (match && match.index !== undefined) {
    const idx = match.index + 1;
    return {
      title: trimmed.slice(0, idx).trim(),
      body: trimmed.slice(idx).trim(),
    };
  }
  const nl = trimmed.indexOf('\n');
  if (nl !== -1) {
    return {
      title: trimmed.slice(0, nl).trim(),
      body: trimmed.slice(nl + 1).trim(),
    };
  }
  return { title: trimmed, body: '' };
}

export function SlideCard({
  slide,
  aspect,
}: {
  slide: Slide;
  aspect: number;
}) {
  const globalTemplate = useCarouselStore((s) => s.style.template);
  const globalLayout = useCarouselStore((s) => s.style.layout);
  const { textColorMode, headingAccent } = useCarouselStore((s) => s.typography);
  const template: TemplateConfig = slide.overrides?.template || globalTemplate;
  const layout: LayoutStyle = slide.overrides?.layout || globalLayout;
  const h = Math.min(Math.max(template.bottomGradient, 0), 60);
  const tone = template.footerStyle;

  const bgTone: 'dark' | 'light' =
    slide.runtime?.bgTone ?? (textColorMode === 'black' ? 'light' : 'dark');
  const baseTextColor = getBaseTextColor(bgTone, textColorMode);
  const titleColor = getHeadingColor(bgTone, textColorMode, headingAccent);

  const { title, body } = splitTextEditorial(slide.body || '');
  const titleSize = Math.round(layout.fontSize * 1.35);
  const bodySize = Math.round(layout.fontSize * 0.9);
  const titleLine = (layout.lineHeight * 1.2) / 1.3;
  const bodyLine = (layout.lineHeight * 1.35) / 1.3;
  const fontMap: Record<TemplateConfig['font'], string> = {
    system: 'var(--font-system)',
    inter: 'var(--font-inter, var(--font-system))',
    playfair: 'var(--font-playfair, var(--font-system))',
    bodoni: 'var(--font-bodoni, var(--font-system))',
    dmsans: 'var(--font-dmsans, var(--font-system))',
  };
  return (
    <div className="ig-frame" style={{ aspectRatio: aspect }}>
      {slide.image ? (
        <img src={slide.image} alt="" draggable={false} />
      ) : (
        <div className="ig-placeholder" />
      )}
      {tone !== 'none' && (
        <div
          className="footer-gradient"
          style={{
            background:
              tone === 'dark'
                ? `linear-gradient(to top, rgba(0,0,0,.68) 0%, rgba(0,0,0,0) ${h}%)`
                : `linear-gradient(to top, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) ${h}%)`,
          }}
        />
      )}
      {(title || body || slide.nickname) && (
        <div className="overlay editorial">
          {(title || body) && (
            <div
              className="text"
              style={{ maxWidth: `${layout.blockWidth}%`, padding: layout.padding }}
            >
              {title && (
                <div
                  className="title"
                  style={{
                    fontSize: titleSize,
                    lineHeight: titleLine,
                    fontFamily: fontMap[template.font],
                    color: titleColor,
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
                    fontSize: bodySize,
                    lineHeight: bodyLine,
                    fontFamily: fontMap[template.font],
                    color: baseTextColor,
                    opacity: 0.92,
                  }}
                >
                  {body}
                </div>
              )}
            </div>
          )}
          {slide.nickname && template.showNickname && (
            <div className="nickname" style={{ marginTop: layout.nickOffset }}>
              {slide.nickname}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
