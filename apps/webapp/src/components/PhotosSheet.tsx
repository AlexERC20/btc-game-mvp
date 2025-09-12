import React, { useRef } from 'react';
import BottomSheet from './BottomSheet';
import type { PhotoMeta } from '../types';

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

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr: Promise<string>[] = Array.from(files).map(
      f =>
        new Promise(resolve => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(f);
        })
    );
    Promise.all(arr).then(onAdd);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Photos">
        <div className="flex gap-2 mb-4">
          <button onClick={() => fileRef.current?.click()} className="btn btn-secondary">
            Add photo
          </button>
          <button onClick={onDone} className="btn btn-primary">
            Done
          </button>
        </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => onFiles(e.target.files)}
      />

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
    </BottomSheet>
  );
}

