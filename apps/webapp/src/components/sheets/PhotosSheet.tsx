import { useState, useRef } from 'react';
import { photosActions, usePhotos, PhotoId, useCarouselStore } from '@/state/store';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon, PlusIcon } from '@/ui/icons';
import Sheet from '../Sheet/Sheet';
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
  const fileRef = useRef<HTMLInputElement>(null);

  const onAdd = (files: FileList | null) => {
    if (!files) return;
    photosActions.addFiles(Array.from(files));
  };

  const onPick = () => fileRef.current?.click();

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
    <Sheet
      title="Photos"
      left={
        <button className="btn" onClick={onPick}>
          <PlusIcon /> Add photo
        </button>
      }
      right={
        <button className="btn primary" disabled={!selected.length} onClick={onDone}>
          Done
        </button>
      }
    >
      <div className="photos-sheet">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onAdd(e.target.files)}
          hidden
        />
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
                  className={'photoCard' + (isActive ? ' is-active' : '')}
                  onClick={() => toggleSelect(p.id)}
                >
                  <img
                    className="photoCard__img"
                    src={p.src}
                    alt={p.fileName ?? 'photo'}
                    loading="lazy"
                  />
                  <div className="photoCard__badge">{order + 1}</div>
                  <div className="photoCard__actions">
                    <button
                      className="photoBtn"
                      aria-label="Переместить влево"
                      disabled={!isActive || idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLeft(p.id);
                      }}
                    >
                      <ArrowLeftIcon />
                    </button>
                    <button
                      className="photoBtn"
                      aria-label="Удалить"
                      disabled={!isActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOne(p.id);
                      }}
                    >
                      <TrashIcon />
                    </button>
                    <button
                      className="photoBtn"
                      aria-label="Переместить вправо"
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
        <div className="sheet__footer">
          <button className="btn primary" disabled={!selected.length} onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </Sheet>
  );
}
