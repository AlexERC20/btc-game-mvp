import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  photosActions,
  usePhotos,
  Photo,
  PhotoId,
  PhotoTransform,
  useCarouselStore,
  slidesActions,
  normalizeCollage,
} from '@/state/store';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  TrashIcon,
  CheckIcon,
  PencilIcon,
  SwapIcon,
} from '@/ui/icons';
import { resolvePhotoSource } from '@/utils/photos';
import { computeCollageBoxes } from '@/utils/collage';
import { CollageSlotImage } from '@/components/collage/CollageSlotImage';
import { CollageCropModal } from '@/components/collage/CollageCropModal';
import '@/styles/photos-sheet.css';

type MenuState = {
  photo: Photo;
  anchor: { x: number; y: number };
};

type CropState = {
  slot: 'top' | 'bottom';
  photoId: string;
  photoSrc: string;
};

const impact = (style: 'light' | 'medium' = 'light') => {
  try {
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
  } catch {}
  try {
    navigator.vibrate?.(10);
  } catch {}
};

type SlotPreviewProps = {
  label: string;
  box: { width: number; height: number };
  src?: string;
  transform: { scale: number; offsetX: number; offsetY: number };
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  canEdit: boolean;
};

function SlotPreview({ label, box, src, transform, active, onSelect, onEdit, canEdit }: SlotPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const update = () => setFrameWidth(element.clientWidth);
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(element);
      return () => observer.disconnect();
    }
    return () => {};
  }, []);

  const scale = frameWidth > 0 ? frameWidth / box.width : 1;
  const scaledBox = useMemo(
    () => ({ width: box.width * scale, height: box.height * scale }),
    [box.height, box.width, scale],
  );
  const scaledTransform = useMemo(
    () => ({
      scale: transform.scale,
      offsetX: transform.offsetX * scale,
      offsetY: transform.offsetY * scale,
    }),
    [scale, transform.offsetX, transform.offsetY, transform.scale],
  );

  return (
    <div className={`slot-preview${active ? ' is-active' : ''}`}>
      <div className="slot-preview__header">
        <span>{label}</span>
        <button
          type="button"
          className="slot-preview__edit"
          onClick={onEdit}
          disabled={!canEdit}
          aria-label="Edit crop"
        >
          <PencilIcon />
        </button>
      </div>
      <div
        ref={frameRef}
        className="slot-preview__frame"
        style={{ aspectRatio: `${box.width} / ${box.height}` }}
        onClick={onSelect}
      >
        <div className="slot-preview__surface">
          {src ? (
            <CollageSlotImage src={src} box={scaledBox} transform={scaledTransform} />
          ) : (
            <div className="slot-preview__placeholder">Добавьте фото</div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBadges(badges: string[] | undefined) {
  if (!badges || badges.length === 0) return undefined;
  return badges.join(', ');
}

export default function PhotosSheet() {
  const panelRef = useRef<HTMLDivElement>(null);
  const { items } = usePhotos();
  const [selected, setSelected] = useState<PhotoId[]>([]);
  const [activeSlot, setActiveSlot] = useState<'top' | 'bottom'>('top');
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const holdRef = useRef<{ timer: number; photo: Photo; target: HTMLElement | null } | null>(null);

  const closeSheet = useCarouselStore((s) => s.closeSheet);
  const slides = useCarouselStore((s) => s.slides);
  const activeIndex = useCarouselStore((s) => s.activeIndex);
  const setCollageSlot = useCarouselStore((s) => s.setCollageSlot);
  const swapCollage = useCarouselStore((s) => s.swapCollage);
  const setCollageTransform = useCarouselStore((s) => s.setCollageTransform);
  const applyCollageTemplateToAll = useCarouselStore((s) => s.applyCollageTemplateToAll);
  const autoFillCollage = useCarouselStore((s) => s.autoFillCollage);

  const activeSlide = slides[activeIndex];
  const isCollage = activeSlide?.template === 'collage-50';
  const collage = useMemo(
    () => normalizeCollage(activeSlide?.collage50),
    [activeSlide?.collage50],
  );
  const collageBoxes = useMemo(() => computeCollageBoxes(collage.dividerPx), [collage.dividerPx]);

  const topPreview = useMemo(
    () => (isCollage ? resolvePhotoSource(collage.top.photoId, items) : undefined),
    [collage.top.photoId, isCollage, items],
  );
  const bottomPreview = useMemo(
    () => (isCollage ? resolvePhotoSource(collage.bottom.photoId, items) : undefined),
    [collage.bottom.photoId, isCollage, items],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeSheet]);

  useEffect(() => {
    setSelected((prev) => prev.filter((id) => items.some((p) => p.id === id)));
  }, [items]);

  useEffect(() => {
    if (!isCollage) {
      setActiveSlot('top');
      return;
    }
    if (!collage.top.photoId) {
      setActiveSlot('top');
    } else if (!collage.bottom.photoId) {
      setActiveSlot('bottom');
    }
  }, [isCollage, collage.top.photoId, collage.bottom.photoId]);

  const assignments = useMemo(() => {
    const map = new Map<string, string[]>();
    slides.forEach((slide, index) => {
      if (slide.template !== 'collage-50') return;
      const cfg = normalizeCollage(slide.collage50);
      if (cfg.top.photoId) {
        const key = cfg.top.photoId;
        const list = map.get(key) ?? [];
        list.push(`T${index + 1}`);
        map.set(key, list);
      }
      if (cfg.bottom.photoId) {
        const key = cfg.bottom.photoId;
        const list = map.get(key) ?? [];
        list.push(`B${index + 1}`);
        map.set(key, list);
      }
    });
    return map;
  }, [slides]);

  const toggleSelect = useCallback((id: PhotoId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    impact('light');
  }, []);

  const handleAutoFill = () => {
    if (selected.length === 0) return;
    autoFillCollage(selected);
    impact('medium');
  };

  const handleApplyTemplate = () => {
    applyCollageTemplateToAll();
    impact('medium');
  };

  const handleSwap = () => {
    if (!isCollage) return;
    swapCollage(activeIndex);
    impact('medium');
  };

  const openMenu = (photo: Photo, element: HTMLElement) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = element.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    setMenu({
      photo,
      anchor: {
        x: rect.left - panelRect.left + rect.width / 2,
        y: rect.top - panelRect.top + rect.height + 8,
      },
    });
  };

  const closeMenu = () => setMenu(null);

  const startHold = (photo: Photo, element: HTMLElement) => {
    const timer = window.setTimeout(() => {
      const state = holdRef.current;
      if (!state) return;
      holdRef.current = null;
      if (!activeSlide || !isCollage) return;
      const topEmpty = !collage.top.photoId;
      const bottomEmpty = !collage.bottom.photoId;
      if (topEmpty) {
        setCollageSlot(activeIndex, 'top', photo.id);
        setActiveSlot('bottom');
        impact('light');
      } else if (bottomEmpty) {
        setCollageSlot(activeIndex, 'bottom', photo.id);
        setActiveSlot('top');
        impact('light');
      } else {
        openMenu(photo, element);
      }
    }, 350);
    holdRef.current = { timer, photo, target: element };
  };

  const cancelHold = () => {
    if (holdRef.current) {
      clearTimeout(holdRef.current.timer);
      holdRef.current = null;
    }
  };

  const handleThumbPointerDown = (photo: Photo, event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isCollage) return;
    startHold(photo, event.currentTarget);
  };

  const handleThumbPointerUp = (photo: Photo, event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isCollage) return;
    if (!holdRef.current) return;
    const state = holdRef.current;
    cancelHold();
    openMenu(photo, state?.target ?? event.currentTarget);
  };

  const handleThumbClick = (photo: Photo, event: ReactMouseEvent<HTMLDivElement>) => {
    if (isCollage) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    toggleSelect(photo.id);
  };

  const handleMenuAction = (slot: 'top' | 'bottom', photo: Photo) => {
    if (!activeSlide || !isCollage) return;
    setCollageSlot(activeIndex, slot, photo.id);
    setActiveSlot(slot === 'top' ? 'bottom' : 'top');
    closeMenu();
    impact('light');
  };

  const openCrop = (slot: 'top' | 'bottom') => {
    if (!isCollage) return;
    const photoId = collage[slot].photoId;
    if (!photoId) return;
    const src = resolvePhotoSource(photoId, items);
    if (!src) return;
    setCrop({ slot, photoId, photoSrc: src });
  };

  const handleSaveCrop = (next: PhotoTransform) => {
    if (!crop) return;
    setCollageTransform(activeIndex, crop.slot, next);
    setCrop(null);
    impact('light');
  };

  const handleRemove = (id: PhotoId) => {
    photosActions.remove(id);
  };

  const handleDone = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isCollage) {
      slidesActions.replaceWithPhotos(items);
    }
    closeSheet();
  };

  const moveLeft = (id: PhotoId) => photosActions.move(id, 'left');
  const moveRight = (id: PhotoId) => photosActions.move(id, 'right');

  return (
    <div className="sheet" aria-open="true" onClick={closeSheet}>
      <div className="sheet__overlay" />
      <div className="sheet__panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <div className="actions-row">
          <input
            id="photos-file-input"
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => photosActions.addFiles(event.target.files ? Array.from(event.target.files) : [])}
          />
          <label className="btn-soft add-btn" htmlFor="photos-file-input">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Add photo</span>
          </label>
          <button
            type="button"
            className={`btn-soft${selected.length === 0 ? ' is-disabled' : ''}`}
            onClick={handleAutoFill}
            disabled={selected.length === 0}
          >
            Auto-fill Collage
          </button>
          <button type="button" className="btn-soft" onClick={handleApplyTemplate}>
            Apply template to all slides
          </button>
          <button type="button" className="btn-soft" onClick={handleDone}>
            Done
          </button>
        </div>
        <div className="sheet__content">
          <div className="photos-sheet">
            {items.length === 0 ? (
              <div className="empty">Добавьте фото, чтобы собрать карусель</div>
            ) : (
              <>
                {isCollage && (
                  <div className="collage-overview">
                    <SlotPreview
                      label="Верхний слот"
                      box={{ width: collageBoxes.top.width, height: collageBoxes.top.height }}
                      src={topPreview}
                      transform={collage.top.transform}
                      active={activeSlot === 'top'}
                      onSelect={() => setActiveSlot('top')}
                      onEdit={() => openCrop('top')}
                      canEdit={Boolean(collage.top.photoId)}
                    />
                    <button
                      type="button"
                      className="btn-soft swap-btn"
                      onClick={handleSwap}
                      disabled={!collage.top.photoId && !collage.bottom.photoId}
                    >
                      <SwapIcon />
                      <span>Swap</span>
                    </button>
                    <SlotPreview
                      label="Нижний слот"
                      box={{ width: collageBoxes.bottom.width, height: collageBoxes.bottom.height }}
                      src={bottomPreview}
                      transform={collage.bottom.transform}
                      active={activeSlot === 'bottom'}
                      onSelect={() => setActiveSlot('bottom')}
                      onEdit={() => openCrop('bottom')}
                      canEdit={Boolean(collage.bottom.photoId)}
                    />
                  </div>
                )}
                <div className="photoGrid">
                  {items.map((photo, index) => {
                    const badges = assignments.get(photo.id);
                    const badgeContent = formatBadges(badges);
                    const isSelected = selected.includes(photo.id);
                    const isTop = isCollage && collage.top.photoId === photo.id;
                    const isBottom = isCollage && collage.bottom.photoId === photo.id;
                    return (
                      <div
                        key={photo.id}
                        className={`thumb${isSelected ? ' is-selected' : ''}${isTop ? ' is-top' : ''}${
                          isBottom ? ' is-bottom' : ''
                        }`}
                        onPointerDown={(event) => handleThumbPointerDown(photo, event)}
                        onPointerUp={(event) => handleThumbPointerUp(photo, event)}
                        onPointerLeave={cancelHold}
                        onPointerCancel={cancelHold}
                        onClick={(event) => handleThumbClick(photo, event)}
                      >
                        <img src={photo.src} alt={photo.fileName ?? 'photo'} loading="lazy" />
                        <button
                          type="button"
                          className={`thumb__selector${isSelected ? ' is-active' : ''}`}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSelect(photo.id);
                          }}
                          aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                        >
                          <CheckIcon />
                        </button>
                        {badgeContent && <div className="badge">{badgeContent}</div>}
                        <div className="controls">
                          <button
                            className="btn-circle-soft"
                            aria-label="Move left"
                            disabled={index === 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              moveLeft(photo.id);
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <ArrowLeftIcon />
                          </button>
                          <button
                            className="btn-circle-soft"
                            aria-label="Delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemove(photo.id);
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <TrashIcon />
                          </button>
                          <button
                            className="btn-circle-soft"
                            aria-label="Move right"
                            disabled={index === items.length - 1}
                            onClick={(event) => {
                              event.stopPropagation();
                              moveRight(photo.id);
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <ArrowRightIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        {menu && isCollage && (
          <div className="collage-menu" style={{ left: menu.anchor.x, top: menu.anchor.y }}>
            <button type="button" onClick={() => handleMenuAction('top', menu.photo)}>
              {collage.top.photoId ? 'Replace Top' : 'Set as Top'}
            </button>
            <button type="button" onClick={() => handleMenuAction('bottom', menu.photo)}>
              {collage.bottom.photoId ? 'Replace Bottom' : 'Set as Bottom'}
            </button>
            <button type="button" className="collage-menu__close" onClick={closeMenu}>
              Cancel
            </button>
          </div>
        )}
      </div>
      {crop && (
        <CollageCropModal
          open
          slot={crop.slot}
          photoSrc={crop.photoSrc}
          transform={collage[crop.slot].transform}
          box={crop.slot === 'top' ? collageBoxes.top : collageBoxes.bottom}
          onClose={() => setCrop(null)}
          onSave={handleSaveCrop}
        />
      )}
    </div>
  );
}
