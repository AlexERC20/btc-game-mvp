import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { BASE_FRAME } from '@/features/render/constants';
import {
  Slide,
  usePhotos,
  normalizeCollage,
  normalizeSingle,
  useCarouselStore,
  useUIStore,
  type CropSlot,
  PhotoTransform,
} from '@/state/store';
import type { SlideDesign } from '@/styles/theme';
import { splitEditorialText } from '@/utils/text';
import { composeTextLines } from '@/utils/textLayout';
import { resolveBlockPosition, resolveBlockWidth } from '@/utils/layoutGeometry';
import { resolvePhotoSource } from '@/utils/photos';
import { applyOpacityToColor } from '@/utils/color';
import { getCollageBoxes } from '@/utils/getCollageBoxes';
import { CollageSlotImage } from '@/components/collage/CollageSlotImage';
import { MoreIcon } from '@/ui/icons';
import { haptic } from '@/utils/haptics';
import { CropOverlay } from './CropOverlay';

type MenuItem = { key: string; label: string; action: () => void; disabled?: boolean };

type Props = {
  slide: Slide;
  design: SlideDesign;
  safeAreaEnabled: boolean;
  slideIndex: number;
};

const SAFE_AREA_INSET_X = 96;
const SAFE_AREA_INSET_Y = 120;
const NICKNAME_FONT_SIZE = { S: 18, M: 22, L: 28 } as const;

function formatGradientHeight(heightPct: number) {
  return `${Math.round(heightPct * 100)}%`;
}

export function SlideCard({ slide, design, safeAreaEnabled, slideIndex }: Props) {
  const { theme, typography, layout, template } = design;
  const photos = usePhotos((state) => state.items);
  const isCollage = slide.template === 'collage-50';
  const collage = useMemo(() => normalizeCollage(slide.collage50), [slide.collage50]);
  const singleConfig = useMemo(() => normalizeSingle(slide.single), [slide.single]);
  const collageImages = useMemo(
    () => ({
      top: isCollage ? resolvePhotoSource(collage.top.photoId, photos) : undefined,
      bottom: isCollage ? resolvePhotoSource(collage.bottom.photoId, photos) : undefined,
    }),
    [collage.bottom.photoId, collage.top.photoId, isCollage, photos],
  );
  const collageBoxes = useMemo(() => {
    const safeDivider = Math.min(Math.max(0, collage.dividerPx), BASE_FRAME.height);
    const boxes = getCollageBoxes(BASE_FRAME.width, BASE_FRAME.height, safeDivider);
    return {
      top: boxes.top,
      bottom: boxes.bot,
      divider: { y: boxes.top.h, height: safeDivider },
    };
  }, [collage.dividerPx]);
  const singleImage = useMemo(() => {
    const ref = resolvePhotoSource(slide.photoId, photos);
    if (ref) return ref;
    return slide.image;
  }, [photos, slide.image, slide.photoId]);
  const setTransform = useCarouselStore((s) => s.setTransform);
  const swapCollage = useCarouselStore((s) => s.swapCollage);
  const crop = useUIStore((s) => s.crop);
  const setCrop = useUIStore((s) => s.setCrop);
  const cropHoldTimer = useRef<number | null>(null);
  const cropActive = crop.active;
  const cropping = cropActive && crop.slideId === slide.id;
  const cropSlot = cropping ? crop.slot : null;
  const isCroppingTop = cropping && cropSlot === 'top';
  const isCroppingBottom = cropping && cropSlot === 'bottom';
  const isCroppingSingle = cropping && cropSlot === 'single';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const initialTransformRef = useRef<{ slot: CropSlot; transform: PhotoTransform } | null>(null);

  const closeCrop = useCallback(() => {
    setCrop({ active: false, slot: null, slideId: null });
  }, [setCrop]);

  const openSingleCrop = useCallback(() => {
    if (cropActive) return;
    if (!singleImage) return;
    setCrop({ active: true, slot: 'single', slideId: slide.id });
  }, [cropActive, setCrop, singleImage, slide.id]);

  const openCollageCrop = useCallback(
    (slot: 'top' | 'bottom') => {
      if (cropActive || !isCollage) return;
      const src = slot === 'top' ? collageImages.top : collageImages.bottom;
      if (!src) return;
      setCrop({ active: true, slot, slideId: slide.id });
    },
    [collageImages.bottom, collageImages.top, cropActive, isCollage, setCrop, slide.id],
  );

  const clearCropHold = useCallback(() => {
    if (cropHoldTimer.current !== null) {
      window.clearTimeout(cropHoldTimer.current);
      cropHoldTimer.current = null;
    }
  }, []);

  const startCropHold = useCallback(
    (slot: 'top' | 'bottom') => {
      if (cropActive || !isCollage) return;
      const hasImage = slot === 'top' ? collageImages.top : collageImages.bottom;
      if (!hasImage) return;
      clearCropHold();
      cropHoldTimer.current = window.setTimeout(() => {
        cropHoldTimer.current = null;
        openCollageCrop(slot);
      }, 350);
    },
    [clearCropHold, collageImages.bottom, collageImages.top, cropActive, isCollage, openCollageCrop],
  );

  useEffect(() => () => clearCropHold(), [clearCropHold]);

  useEffect(() => {
    if (!cropping) return;
    if (!cropSlot) {
      closeCrop();
      return;
    }
    if (cropSlot === 'single') {
      if (slide.template !== 'single' || !singleImage) {
        closeCrop();
      }
      return;
    }
    if (!isCollage) {
      closeCrop();
      return;
    }
    const hasImage = cropSlot === 'top' ? collageImages.top : collageImages.bottom;
    if (!hasImage) {
      closeCrop();
    }
  }, [closeCrop, collageImages.bottom, collageImages.top, cropSlot, cropping, isCollage, singleImage, slide.template]);

  useEffect(() => {
    if (cropping) {
      clearCropHold();
    }
  }, [clearCropHold, cropping]);

  useEffect(() => {
    if (!cropping) {
      initialTransformRef.current = null;
      return;
    }
    if (!cropSlot || initialTransformRef.current) return;
    if (cropSlot === 'single') {
      initialTransformRef.current = { slot: 'single', transform: { ...singleConfig.transform } };
      return;
    }
    if (!isCollage) return;
    const source = cropSlot === 'top' ? collage.top.transform : collage.bottom.transform;
    initialTransformRef.current = { slot: cropSlot, transform: { ...source } };
  }, [
    collage.bottom.transform,
    collage.top.transform,
    cropSlot,
    cropping,
    isCollage,
    singleConfig.transform,
  ]);

  const handleCropSave = useCallback(
    (slot: CropSlot, next: PhotoTransform) => {
      setTransform(slideIndex, slot, next);
      initialTransformRef.current = null;
      closeCrop();
      haptic('success');
    },
    [closeCrop, setTransform, slideIndex],
  );

  const handleCropCancel = useCallback(() => {
    const previous = initialTransformRef.current;
    if (previous) {
      setTransform(slideIndex, previous.slot, previous.transform);
    }
    initialTransformRef.current = null;
    closeCrop();
  }, [closeCrop, setTransform, slideIndex]);

  const handleCropChange = useCallback(
    (slot: CropSlot, next: PhotoTransform) => {
      setTransform(slideIndex, slot, next);
    },
    [setTransform, slideIndex],
  );

  const handleSlotPointerDown = useCallback(
    (slot: 'top' | 'bottom') => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== undefined && event.button !== 0) return;
      startCropHold(slot);
    },
    [startCropHold],
  );

  const handleSlotPointerEnd = useCallback(() => {
    clearCropHold();
  }, [clearCropHold]);
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

  const menuItems = useMemo<MenuItem[]>(() => {
    if (isCollage) {
      const hasTop = Boolean(collageImages.top);
      const hasBottom = Boolean(collageImages.bottom);
      return [
        {
          key: 'swap',
          label: 'Swap',
          action: () => swapCollage(slideIndex),
          disabled: !(hasTop && hasBottom),
        },
        {
          key: 'crop-top',
          label: 'Crop top',
          action: () => openCollageCrop('top'),
          disabled: !hasTop,
        },
        {
          key: 'crop-bottom',
          label: 'Crop bottom',
          action: () => openCollageCrop('bottom'),
          disabled: !hasBottom,
        },
      ];
    }
    if (singleImage) {
      return [
        {
          key: 'crop',
          label: 'Crop',
          action: () => openSingleCrop(),
        },
      ];
    }
    return [];
  }, [
    collageImages.bottom,
    collageImages.top,
    isCollage,
    openCollageCrop,
    openSingleCrop,
    singleImage,
    swapCollage,
    slideIndex,
  ]);

  const hasMenuItems = menuItems.length > 0;

  const cropPhotoSrc = useMemo(() => {
    if (!cropping || !cropSlot) return undefined;
    if (cropSlot === 'single') {
      return singleImage ?? undefined;
    }
    if (!isCollage) return undefined;
    return cropSlot === 'top' ? collageImages.top : collageImages.bottom;
  }, [collageImages.bottom, collageImages.top, cropSlot, cropping, isCollage, singleImage]);

  const cropBox = useMemo(() => {
    if (!cropping || !cropSlot) return undefined;
    if (cropSlot === 'single') {
      return { x: 0, y: 0, w: BASE_FRAME.width, h: BASE_FRAME.height };
    }
    if (!isCollage) return undefined;
    const target = cropSlot === 'top' ? collageBoxes.top : collageBoxes.bottom;
    return { x: target.x, y: target.y, w: target.w, h: target.h };
  }, [collageBoxes.bottom, collageBoxes.top, cropSlot, cropping, isCollage]);

  const cropTransform = useMemo(() => {
    if (!cropping || !cropSlot) return undefined;
    if (cropSlot === 'single') {
      return { ...singleConfig.transform };
    }
    if (!isCollage) return undefined;
    const source = cropSlot === 'top' ? collage.top.transform : collage.bottom.transform;
    return { ...source };
  }, [collage.bottom.transform, collage.top.transform, cropSlot, cropping, isCollage, singleConfig.transform]);

  useEffect(() => {
    if (cropping) {
      setMenuOpen(false);
    }
  }, [cropping]);

  useEffect(() => {
    if (!hasMenuItems) {
      setMenuOpen(false);
    }
  }, [hasMenuItems]);

  const handleMenuToggle = useCallback(() => {
    if (!hasMenuItems) return;
    setMenuOpen((prev) => {
      if (prev) return false;
      haptic('selection');
      return true;
    });
  }, [hasMenuItems]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target) || menuTriggerRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

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
                className={`collage-slot${collageImages.top ? '' : ' is-empty'}${cropping && cropSlot !== 'top' ? ' is-dimmed' : ''}${cropping && cropSlot === 'top' ? ' is-active' : ''}`}
                style={{
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: collageBoxes.top.h,
                }}
                onPointerDown={handleSlotPointerDown('top')}
                onPointerUp={handleSlotPointerEnd}
                onPointerLeave={handleSlotPointerEnd}
                onPointerCancel={handleSlotPointerEnd}
              >
                {collageImages.top && collageBoxes.top.h > 0 ? (
                  <CollageSlotImage
                    src={collageImages.top}
                    box={{ x: 0, y: 0, w: collageBoxes.top.w, h: collageBoxes.top.h }}
                    transform={collage.top.transform}
                    className="collage-slot__image"
                    hidden={isCroppingTop}
                  />
                ) : (
                  <span className="collage-slot__placeholder">Добавьте фото</span>
                )}
              </div>
              <div
                className={`collage-slot${collageImages.bottom ? '' : ' is-empty'}${cropping && cropSlot !== 'bottom' ? ' is-dimmed' : ''}${cropping && cropSlot === 'bottom' ? ' is-active' : ''}`}
                style={{
                  top: collageBoxes.bottom.y,
                  left: 0,
                  width: '100%',
                  height: collageBoxes.bottom.h,
                }}
                onPointerDown={handleSlotPointerDown('bottom')}
                onPointerUp={handleSlotPointerEnd}
                onPointerLeave={handleSlotPointerEnd}
                onPointerCancel={handleSlotPointerEnd}
              >
                {collageImages.bottom && collageBoxes.bottom.h > 0 ? (
                  <CollageSlotImage
                    src={collageImages.bottom}
                    box={{ x: 0, y: 0, w: collageBoxes.bottom.w, h: collageBoxes.bottom.h }}
                    transform={collage.bottom.transform}
                    className="collage-slot__image"
                    hidden={isCroppingBottom}
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
          ) : singleImage ? (
            <div className="single-slot">
              <CollageSlotImage
                src={singleImage}
                box={{ x: 0, y: 0, w: BASE_FRAME.width, h: BASE_FRAME.height }}
                transform={singleConfig.transform}
                className="single-slot__image"
                hidden={isCroppingSingle}
              />
            </div>
          ) : (
            <div className="ig-placeholder" />
          )}
          {!cropping && isCollage && <div className="collage-tag">Collage</div>}
          {!cropping && theme.gradient !== 'original' && theme.gradientStops.heightPct > 0 && (
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
          {!cropping && safeAreaEnabled && (
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
          {!cropping &&
            (composition.text.lines.length > 0 || (slide.nickname && template.showNickname)) && (
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
          {!cropping && hasMenuItems && (
            <div className="slide-tools">
              <button
                ref={menuTriggerRef}
                type="button"
                className={`slide-tools__menu-trigger${menuOpen ? ' is-open' : ''}`}
                onClick={handleMenuToggle}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label="Open slide menu"
              >
                <MoreIcon />
              </button>
              {menuOpen && (
                <div ref={menuRef} className="slide-tools__menu" role="menu">
                  {menuItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`slide-tools__menu-item${item.disabled ? ' is-disabled' : ''}`}
                      onClick={() => {
                        if (item.disabled) return;
                        haptic('medium');
                        setMenuOpen(false);
                        item.action();
                      }}
                      disabled={item.disabled}
                      role="menuitem"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {cropping && cropSlot && cropPhotoSrc && cropBox && cropTransform && (
            <CropOverlay
              slot={cropSlot}
              photoSrc={cropPhotoSrc}
              box={cropBox}
              transform={cropTransform}
              onCancel={handleCropCancel}
              onSave={handleCropSave}
              onChange={handleCropChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
