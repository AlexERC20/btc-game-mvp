import { photosActions, usePhotos } from '../../state/store';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon, PlusIcon } from '../../ui/icons';
import Sheet from '../Sheet/Sheet';
import '../../styles/photos-sheet.css';

export default function PhotosSheet() {
  const { items, selectedId } = usePhotos();

  const onAdd = (files: FileList | null) => {
    if (!files) return;
    photosActions.addFiles(Array.from(files));
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectedId) return;
    if (e.key === 'ArrowLeft') photosActions.move(selectedId, 'left');
    else if (e.key === 'ArrowRight') photosActions.move(selectedId, 'right');
    else if (e.key === 'Delete' || e.key === 'Backspace') photosActions.remove(selectedId);
  };

  return (
    <Sheet title="Photos">
      <div className="photos-sheet" tabIndex={0} onKeyDown={onKey}>
        <label className="add-btn">
          <PlusIcon /> Добавить фото
          <input type="file" accept="image/*" multiple onChange={(e) => onAdd(e.target.files)} hidden />
        </label>

        {items.length === 0 ? (
          <div className="empty">Добавьте фото, чтобы собрать карусель</div>
        ) : (
          <div className="thumb-grid">
            {items.map((p, idx) => (
              <div
                key={p.id}
                className={'thumb ' + (p.id === selectedId ? 'selected' : '')}
                onClick={() => photosActions.setSelected(p.id)}
              >
                <img src={p.src} alt={p.fileName ?? 'photo'} loading="lazy" />
                <div className="controls">
                  <button
                    aria-label="Переместить влево"
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      photosActions.move(p.id, 'left');
                    }}
                  >
                    <ArrowLeftIcon />
                  </button>
                  <button
                    aria-label="Удалить"
                    onClick={(e) => {
                      e.stopPropagation();
                      photosActions.remove(p.id);
                    }}
                  >
                    <TrashIcon />
                  </button>
                  <button
                    aria-label="Переместить вправо"
                    disabled={idx === items.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      photosActions.move(p.id, 'right');
                    }}
                  >
                    <ArrowRightIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

