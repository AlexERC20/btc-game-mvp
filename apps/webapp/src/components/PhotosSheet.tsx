import React, { useRef } from 'react';
import BottomSheet from './BottomSheet';
import type { PhotoMeta } from '../types';
import { Action } from '../ui/Action';
import { PlusIcon, CheckIcon } from '../ui/icons';

export default function PhotosSheet({
  open,
  onClose,
  onDone,
  photos,
  onAdd,
  onDelete,
  onMove,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  photos: PhotoMeta[];
  onAdd: (urls: string[]) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onAddPhoto = () => fileRef.current?.click();

  const onFilesSelected: React.ChangeEventHandler<HTMLInputElement> = e => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      const arr: Promise<string>[] = files.map(
        f =>
          new Promise(resolve => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.readAsDataURL(f);
          })
      );
      Promise.all(arr).then(onAdd);
    }
    e.currentTarget.value = '';
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={null}>
      <div className="sheet__header">
        <div className="sheet__title">Photos</div>
        <div className="sheet__actions">
          <Action
            variant="primary"
            size="md"
            iconLeft={<PlusIcon size={20} />}
            onClick={onAddPhoto}
          >
            Add photo
          </Action>
          <Action
            variant="ghost"
            size="md"
            iconLeft={<CheckIcon size={20} />}
            onClick={onDone}
          >
            Done
          </Action>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onFilesSelected}
        />
      </div>

      <div className="sheet__content">
        <div className="photos-grid">
          {photos.map(p => (
            <div
              key={p.id}
              className="relative rounded-2xl overflow-hidden aspect-square ring-1 ring-white/10"
            >
              <img src={p.url} className="w-full h-full object-cover" />
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDelete(p.id);
                }}
                className="absolute top-1 right-1 text-xs bg-black/60 rounded px-1.5 py-0.5"
              >
                ×
              </button>
              <div className="absolute bottom-1 left-1 right-1 flex justify-between text-xs">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onMove(p.id, -1);
                  }}
                  className="bg-black/60 rounded px-1"
                >
                  ←
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onMove(p.id, 1);
                  }}
                  className="bg-black/60 rounded px-1"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

