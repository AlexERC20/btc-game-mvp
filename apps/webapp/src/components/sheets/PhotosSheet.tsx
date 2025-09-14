import { useState, useEffect } from 'react';
import {
  photosActions,
  usePhotos,
  PhotoId,
  useCarouselStore,
} from '@/state/store';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon } from '@/ui/icons';
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
  const close = useCarouselStore((s) => s.closeSheet);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [close]);

  const onAdd = (files: FileList | null) => {
    if (!files) return;
    photosActions.addFiles(Array.from(files));
  };

  const toggleSelect = (id: PhotoId) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((i) => i !== id) : [...s, id]
    );
    impact('light');
  };

  const moveLeft = (id: PhotoId) => photosActions.move(id, 'left');
  const moveRight = (id: PhotoId) => photosActions.move(id, 'right');

  const removeOne = (id: PhotoId) => photosActions.remove(id);

  const onDone = () => {
    if (!selected.length) return;
    impact('medium');
    const { slides, activeIndex, updateSlide, addSlide, closeSheet } = useCarouselStore.getState();
    const photos = selected
      .map((id) => items.find((p) => p.id === id))
      .filter(Boolean) as typeof items;
    let idx = activeIndex;
    for (const p of photos) {
      if (idx >= slides.length) {
        addSlide({ image: p.src });
      } else {
        updateSlide(slides[idx].id, { image: p.src });
      }
      idx++;
    }
    setSelected([]);
    closeSheet();
  };

  return (
    <div className="sheet" aria-open="true" onClick={close}>
      <div className="sheet__overlay" />
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <div className="title">Photos</div>
          <button
            className="btn-primary"
            disabled={!selected.length}
            onClick={onDone}
          >
            Done
          </button>
        </header>
        <div className="sheet__content">
          <div className="photos-sheet">
            <label className="btn-soft add-btn">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>Add photo</span>
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => onAdd(e.target.files)}
              />
            </label>
            {items.length === 0 ? (
              <div className="empty">Добавьте фото, чтобы собрать карусель</div>
            ) : (
              <div className="photoGrid">
                {items.map((p, idx) => {
                  const isActive = selected.includes(p.id);
                  const order = selected.indexOf(p.id);
                  return (
                    <div
                      key={p.id}
                      className={"thumb" + (isActive ? " is-active" : "")}
                      onClick={() => toggleSelect(p.id)}
                    >
                      <img
                        src={p.src}
                        alt={p.fileName ?? 'photo'}
                        loading="lazy"
                      />
                      <div className="badge">{order + 1}</div>
                      <div className="controls">
                        <button
                          className="btn-circle-soft"
                          aria-label="Left"
                          disabled={!isActive || idx === 0}
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
                          disabled={!isActive}
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
                          disabled={!isActive || idx === items.length - 1}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
