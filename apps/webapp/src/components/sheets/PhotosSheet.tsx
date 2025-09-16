import { useState, useEffect, useMemo, MouseEvent } from 'react';
import {
  photosActions,
  usePhotos,
  PhotoId,
  useCarouselStore,
  slidesActions,
  DEFAULT_COLLAGE_50,
} from '@/state/store';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon } from '@/ui/icons';
import { resolvePhotoSource } from '@/utils/photos';
import '@/styles/photos-sheet.css';

const impact = (style: 'light' | 'medium' = 'light') => {
  try {
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
  } catch {}
  try {
    navigator.vibrate?.(10);
  } catch {}
};

export default function PhotosSheet() {
  const { items } = usePhotos();
  const [selected, setSelected] = useState<PhotoId[]>([]);
  const [activeSlot, setActiveSlot] = useState<'top' | 'bottom'>('top');
  const onClose = useCarouselStore((s) => s.closeSheet);
  const activeSlide = useCarouselStore((s) => s.slides[s.activeIndex]);
  const updateSlide = useCarouselStore((s) => s.updateSlide);

  const collageConfig = useMemo(
    () => ({ ...DEFAULT_COLLAGE_50, ...(activeSlide?.collage50 ?? {}) }),
    [activeSlide?.collage50],
  );
  const isCollage = activeSlide?.template === 'collage-50';
  const topPreview = useMemo(
    () => (isCollage ? resolvePhotoSource(collageConfig.topPhoto, items) : undefined),
    [collageConfig.topPhoto, isCollage, items],
  );
  const bottomPreview = useMemo(
    () => (isCollage ? resolvePhotoSource(collageConfig.bottomPhoto, items) : undefined),
    [collageConfig.bottomPhoto, isCollage, items],
  );

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  useEffect(() => {
    if (!isCollage) {
      setSelected([]);
      setActiveSlot('top');
      return;
    }
    if (!collageConfig.topPhoto) {
      setActiveSlot('top');
    } else if (!collageConfig.bottomPhoto) {
      setActiveSlot('bottom');
    }
  }, [isCollage, collageConfig.topPhoto, collageConfig.bottomPhoto]);

  const onAdd = (files: FileList | null) => {
    if (!files) return;
    photosActions.addFiles(Array.from(files));
  };

  const assignCollagePhoto = (slot: 'top' | 'bottom', id: PhotoId) => {
    if (!activeSlide) return;
    updateSlide(activeSlide.id, {
      collage50: {
        ...collageConfig,
        [slot === 'top' ? 'topPhoto' : 'bottomPhoto']: id,
      },
    });
  };

  const swapCollagePhotos = () => {
    if (!activeSlide) return;
    updateSlide(activeSlide.id, {
      collage50: {
        ...collageConfig,
        topPhoto: collageConfig.bottomPhoto,
        bottomPhoto: collageConfig.topPhoto,
      },
    });
    impact('medium');
  };

  const toggleSelect = (id: PhotoId) => {
    if (isCollage) {
      assignCollagePhoto(activeSlot, id);
      setActiveSlot((prev) => (prev === 'top' ? 'bottom' : 'top'));
      impact('light');
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((i) => i !== id) : [...s, id]));
    impact('light');
  };

  const moveLeft = (id: PhotoId) => photosActions.move(id, 'left');
  const moveRight = (id: PhotoId) => photosActions.move(id, 'right');

  const removeOne = (id: PhotoId) => {
    photosActions.remove(id);
    if (isCollage && activeSlide) {
      const next = { ...collageConfig };
      let changed = false;
      if (next.topPhoto === id) {
        next.topPhoto = undefined;
        changed = true;
      }
      if (next.bottomPhoto === id) {
        next.bottomPhoto = undefined;
        changed = true;
      }
      if (changed) {
        updateSlide(activeSlide.id, { collage50: next });
      }
    }
  };

  const onDone = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCollage) {
      onClose();
      return;
    }
    slidesActions.replaceWithPhotos(items);
    onClose();
  };

  const inputId = 'photos-file-input';
  const canSwap = Boolean(collageConfig.topPhoto || collageConfig.bottomPhoto);

  return (
    <div className="sheet" aria-open="true" onClick={onClose}>
      <div className="sheet__overlay" />
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="actions-row">
          <input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onAdd(e.target.files)}
          />
          <label className="btn-soft add-btn" htmlFor={inputId}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>Add photo</span>
          </label>

          <button type="button" className="btn-soft" onClick={onDone}>
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
                  <div className="collage-slot-preview">
                    <div
                      className={`collage-slot-preview__item${activeSlot === 'top' ? ' is-active' : ''}`}
                      onClick={() => setActiveSlot('top')}
                    >
                      <div className="collage-slot-preview__label">Верхнее фото</div>
                      <div className="collage-slot-preview__frame">
                        {topPreview ? (
                          <img src={topPreview} alt="" />
                        ) : (
                          <div className="collage-slot-preview__placeholder">Добавьте фото</div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-soft swap-btn"
                      onClick={swapCollagePhotos}
                      disabled={!canSwap}
                    >
                      Swap
                    </button>
                    <div
                      className={`collage-slot-preview__item${activeSlot === 'bottom' ? ' is-active' : ''}`}
                      onClick={() => setActiveSlot('bottom')}
                    >
                      <div className="collage-slot-preview__label">Нижнее фото</div>
                      <div className="collage-slot-preview__frame">
                        {bottomPreview ? (
                          <img src={bottomPreview} alt="" />
                        ) : (
                          <div className="collage-slot-preview__placeholder">Добавьте фото</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="photoGrid">
                  {items.map((p, idx) => {
                    const isAssignedTop = isCollage && collageConfig.topPhoto === p.id;
                    const isAssignedBottom = isCollage && collageConfig.bottomPhoto === p.id;
                    const isActive = isCollage ? isAssignedTop || isAssignedBottom : selected.includes(p.id);
                    const order = selected.indexOf(p.id);
                    const badgeContent = isCollage
                      ? isAssignedTop
                        ? 'Top'
                        : isAssignedBottom
                        ? 'Bottom'
                        : null
                      : order >= 0
                      ? String(order + 1)
                      : null;
                    const controlsDisabled = !isCollage && !isActive;
                    return (
                      <div
                        key={p.id}
                        className={
                          'thumb' +
                          (isActive ? ' is-active' : '') +
                          (isAssignedTop ? ' is-top' : '') +
                          (isAssignedBottom ? ' is-bottom' : '')
                        }
                        onClick={() => toggleSelect(p.id)}
                      >
                        <img src={p.src} alt={p.fileName ?? 'photo'} loading="lazy" />
                        {badgeContent && <div className="badge">{badgeContent}</div>}
                        <div className="controls">
                          <button
                            className="btn-circle-soft"
                            aria-label="Left"
                            disabled={controlsDisabled || idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLeft(p.id);
                            }}
                          >
                            <ArrowLeftIcon />
                          </button>
                          <button
                            className="btn-circle-soft"
                            aria-label="Delete"
                            disabled={controlsDisabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeOne(p.id);
                            }}
                          >
                            <TrashIcon />
                          </button>
                          <button
                            className="btn-circle-soft"
                            aria-label="Right"
                            disabled={controlsDisabled || idx === items.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveRight(p.id);
                            }}
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
      </div>
    </div>
  );
}
