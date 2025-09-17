import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BASE_FRAME } from '@/features/render/constants';
import { Slide, usePhotos, normalizeCollage } from '@/state/store';
import type { SlideDesign } from '@/styles/theme';
import { splitEditorialText } from '@/utils/text';
import { composeTextLines } from '@/utils/textLayout';
import { resolveBlockPosition, resolveBlockWidth } from '@/utils/layoutGeometry';
import { resolvePhotoSource } from '@/utils/photos';
import { applyOpacityToColor } from '@/utils/color';
import { computeCollageBoxes } from '@/utils/collage';
import { CollageSlotImage } from '@/components/collage/CollageSlotImage';

type Props = {
  slide: Slide;
  design: SlideDesign;
  safeAreaEnabled: boolean;
};

const SAFE_AREA_INSET_X = 96;
const SAFE_AREA_INSET_Y = 120;
const NICKNAME_FONT_SIZE = { S: 18, M: 22, L: 28 } as const;

function formatGradientHeight(heightPct: number) {
  return `${Math.round(heightPct * 100)}%`;
}

export function SlideCard({ slide, design, safeAreaEnabled }: Props) {
  const { theme, typography, layout, template } = design;
  const photos = usePhotos((state) => state.items);
  const isCollage = slide.template === 'collage-50';
  const collage = useMemo(() => normalizeCollage(slide.collage50), [slide.collage50]);
  const collageImages = useMemo(
    () => ({
      top: isCollage ? resolvePhotoSource(collage.top.photoId, photos) : undefined,
      bottom: isCollage ? resolvePhotoSource(collage.bottom.photoId, photos) : undefined,
    }),
    [collage.bottom.photoId, collage.top.photoId, isCollage, photos],
  );
  const collageBoxes = useMemo(
    () => computeCollageBoxes(collage.dividerPx),
    [collage.dividerPx],
  );
  const collageDividerColor = useMemo(() => {
    if (!isCollage) return undefined;
    const baseColor = collage.dividerColor === 'auto' ? theme.textColor : collage.dividerColor;
    const opacity = collage.dividerOpacity;
    return applyOpacityToColor(baseColor, opacity);
  }, [collage.dividerColor, collage.dividerOpacity, isCollage, theme.textColor]);
  const { title, body } = useMemo(() => splitEditorialText(slide.body ?? ''), [slide.body]);

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

  const measurementContext = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    return canvas.getContext('2d');
  }, []);

  const composition = useMemo(() => {
    if (!measurementContext) {
      return {
        block: {
          position: { x: layout.padding, y: layout.padding },
          width: BASE_FRAME.width - layout.padding * 2,
          height: BASE_FRAME.height - layout.padding * 2,
        },
        text: { lines: [], contentHeight: 0, truncated: false, fadeMaskStart: undefined },
      };
    }

    const { blockWidth, textWidth } = resolveBlockWidth(BASE_FRAME.width, layout);
    const text = composeTextLines({
      ctx: measurementContext,
      maxWidth: textWidth,
      title,
      body,
      typography,
      colors: {
        title: theme.titleColor ?? theme.textColor,
        body: theme.textColor,
      },
      paragraphGap: layout.paragraphGap,
      overflow: layout.overflow,
      maxLines: layout.maxLines,
    });
    const blockHeight = text.contentHeight + layout.padding * 2;
    const position = resolveBlockPosition(
      BASE_FRAME.width,
      BASE_FRAME.height,
      layout,
      blockWidth,
      blockHeight,
    );
    return {
      block: { position, width: blockWidth, height: blockHeight },
      text,
    };
  }, [measurementContext, layout, typography, theme, title, body]);

  const textShadow = useMemo(() => {
    const shadow = theme.shadow;
    return shadow ? `0 ${shadow.y}px ${shadow.blur}px ${shadow.color}` : undefined;
  }, [theme.shadow]);

  const fadeMaskStyle = useMemo(() => {
    if (composition.text.fadeMaskStart === undefined) return undefined;
    const start = Math.max(0, Math.min(composition.text.fadeMaskStart, 1));
    const startPct = (start * 100).toFixed(2);
    return {
      WebkitMaskImage: `linear-gradient(to bottom, rgba(0,0,0,1) ${startPct}%, rgba(0,0,0,0) 100%)`,
      maskImage: `linear-gradient(to bottom, rgba(0,0,0,1) ${startPct}%, rgba(0,0,0,0) 100%)`,
    } as const;
  }, [composition.text.fadeMaskStart]);

  const safeAreaStyle = useMemo(() => {
    const width = Math.max(0, BASE_FRAME.width - SAFE_AREA_INSET_X * 2);
    const height = Math.max(0, BASE_FRAME.height - SAFE_AREA_INSET_Y * 2);
    return {
      left: SAFE_AREA_INSET_X,
      top: SAFE_AREA_INSET_Y,
      width,
      height,
    };
  }, []);

  const nicknameLayout = useMemo(() => {
    if (!slide.nickname || !template.showNickname) return null;
    const fontSize = NICKNAME_FONT_SIZE[layout.nickname.size] ?? 18;
    const paddingX = Math.round(fontSize * 0.75);
    const paddingY = Math.round(fontSize * 0.35);
    const estimatedHeight = fontSize + paddingY * 2;

    let justifyContent: 'flex-start' | 'center' | 'flex-end';
    switch (layout.nickname.position) {
      case 'center':
        justifyContent = 'center';
        break;
      case 'right':
        justifyContent = 'flex-end';
        break;
      default:
        justifyContent = 'flex-start';
        break;
    }

    const baseTop = composition.block.position.y + composition.block.height + layout.nickname.offset;
    const top = Math.max(0, Math.min(baseTop, BASE_FRAME.height - estimatedHeight));
    const normalizedColor = theme.textColor.trim().toLowerCase();
    const isDarkText =
      normalizedColor === '#000000' ||
      normalizedColor === 'black' ||
      normalizedColor === 'rgb(0,0,0)';
    const opacity = Math.max(0, Math.min(layout.nickname.opacity, 1));
    const backgroundAlpha = (isDarkText ? 0.85 : 0.45) * opacity;
    const strokeAlpha = (isDarkText ? 0.2 : 0.18) * opacity;
    const background = isDarkText
      ? `rgba(255,255,255,${backgroundAlpha.toFixed(3)})`
      : `rgba(0,0,0,${backgroundAlpha.toFixed(3)})`;
    const borderColor = isDarkText
      ? `rgba(0,0,0,${strokeAlpha.toFixed(3)})`
      : `rgba(255,255,255,${strokeAlpha.toFixed(3)})`;

    return {
      wrapper: {
        left: composition.block.position.x,
        top,
        width: composition.block.width,
        justifyContent,
        height: estimatedHeight,
      },
      pill: {
        fontSize,
        padding: `${paddingY}px ${paddingX}px`,
        borderRadius: `${estimatedHeight / 2}px`,
        background,
        color: theme.textColor,
        border: strokeAlpha > 0 ? `1px solid ${borderColor}` : 'none',
        lineHeight: 1,
      },
    };
  }, [composition.block, layout.nickname, slide.nickname, template.showNickname, theme.textColor]);

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
          {isCollage ? (
            <div className="collage-frame">
              <div
                className={`collage-slot${collageImages.top ? '' : ' is-empty'}`}
                style={{
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: collageBoxes.top.height,
                }}
              >
                {collageImages.top && collageBoxes.top.height > 0 ? (
                  <CollageSlotImage
                    src={collageImages.top}
                    box={{ width: collageBoxes.top.width, height: collageBoxes.top.height }}
                    transform={collage.top.transform}
                  />
                ) : (
                  <span className="collage-slot__placeholder">Добавьте фото</span>
                )}
              </div>
              <div
                className={`collage-slot${collageImages.bottom ? '' : ' is-empty'}`}
                style={{
                  top: collageBoxes.bottom.y,
                  left: 0,
                  width: '100%',
                  height: collageBoxes.bottom.height,
                }}
              >
                {collageImages.bottom && collageBoxes.bottom.height > 0 ? (
                  <CollageSlotImage
                    src={collageImages.bottom}
                    box={{ width: collageBoxes.bottom.width, height: collageBoxes.bottom.height }}
                    transform={collage.bottom.transform}
                  />
                ) : (
                  <span className="collage-slot__placeholder">Добавьте фото</span>
                )}
              </div>
              {collageBoxes.divider.height > 0 && (
                <div
                  className="collage-divider"
                  style={{
                    top: collageBoxes.divider.y,
                    left: 0,
                    width: '100%',
                    height: collageBoxes.divider.height,
                    background: collageDividerColor,
                  }}
                />
              )}
            </div>
          ) : slide.image ? (
            <img src={slide.image} alt="" draggable={false} />
          ) : (
            <div className="ig-placeholder" />
          )}
          {isCollage && <div className="collage-tag">Collage</div>}
          {theme.gradient !== 'original' && theme.gradientStops.heightPct > 0 && (
            <div
              className="footer-gradient"
              style={{
                background: `linear-gradient(to top, ${theme.gradientStops.to} 0%, ${theme.gradientStops.from} ${formatGradientHeight(
                  theme.gradientStops.heightPct,
                )})`,
                height: formatGradientHeight(theme.gradientStops.heightPct),
              }}
            />
          )}
          {safeAreaEnabled && (
            <div
              className="safe-area-guides"
              style={{
                position: 'absolute',
                left: safeAreaStyle.left,
                top: safeAreaStyle.top,
                width: safeAreaStyle.width,
                height: safeAreaStyle.height,
                border: '2px dashed rgba(255,255,255,0.35)',
                borderRadius: 12,
                pointerEvents: 'none',
              }}
            />
          )}
          {(composition.text.lines.length > 0 || (slide.nickname && template.showNickname)) && (
            <div className="overlay editorial" style={{ position: 'absolute', inset: 0 }}>
              {composition.text.lines.length > 0 && (
                <div
                  className="text-block"
                  style={{
                    position: 'absolute',
                    left: composition.block.position.x,
                    top: composition.block.position.y,
                    width: composition.block.width,
                    height: composition.block.height,
                    padding: layout.padding,
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="text-content"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      ...fadeMaskStyle,
                    }}
                  >
                    {composition.text.lines.map((line, index) => (
                      <div
                        key={`${line.type}-${index}`}
                        style={{
                          fontSize: `${line.style.fontSize}px`,
                          lineHeight: line.style.lineHeight,
                          fontFamily: line.style.fontFamily,
                          fontWeight: line.style.fontWeight,
                          letterSpacing: `${line.style.letterSpacing}px`,
                          color: line.color,
                          marginTop: index === 0 ? 0 : `${line.gapBefore}px`,
                          textShadow,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {slide.nickname && template.showNickname && nicknameLayout && (
                <div
                  className="nickname-wrapper"
                  style={{
                    position: 'absolute',
                    left: nicknameLayout.wrapper.left,
                    top: nicknameLayout.wrapper.top,
                    width: nicknameLayout.wrapper.width,
                    display: 'flex',
                    justifyContent: nicknameLayout.wrapper.justifyContent,
                    pointerEvents: 'none',
                  }}
                >
                  <div className="nickname-pill" style={nicknameLayout.pill}>
                    {slide.nickname}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
