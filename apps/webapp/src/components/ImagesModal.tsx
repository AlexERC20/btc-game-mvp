import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PhotoMeta } from "../types";

const SHEET_HEADER_H = 64; // высота шапки шита (заголовок + кнопки)

export default function ImagesModal({
  open,
  onClose,
  photos,
  onAdd,
  onSelect,
  onDelete,
  onMove,
}: {
  open: boolean;
  onClose: () => void;
  photos: PhotoMeta[];
  onAdd: (urls: string[]) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!open) return null;

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
    Promise.all(arr).then(urls => onAdd(urls));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    onSelect(id);
  };

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <header className="flex items-center justify-between px-4 py-2 sticky top-0 bg-[#111] z-10">
          <h3>Photos</h3>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => fileRef.current?.click()} className="btn btn-secondary">
              Add photo
            </button>
            <button onClick={onClose} className="btn btn-primary">
              Done
            </button>
          </div>
        </header>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => onFiles(e.target.files)}
        />

        <div
          className="sheet__content overflow-auto -mx-4 px-4"
          style={{
            maxHeight: `calc(100vh - ${SHEET_HEADER_H}px - var(--bottom-bar-h, 86px) - env(safe-area-inset-bottom,0px))`,
            paddingBottom: `calc(var(--bottom-bar-h, 86px) + env(safe-area-inset-bottom,0px))`,
          }}
        >
          <div className="photos-grid">
            {photos.map(p => (
              <button
                key={p.id}
                className={`relative rounded-2xl overflow-hidden aspect-square ring-1 ring-white/10 ${
                  selected.has(p.id) ? 'ring-2 ring-blue-400' : ''
                }`}
                onClick={() => toggleSelect(p.id)}
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
              </button>
            ))}
          </div>

          <div style={{ height: 'var(--bottom-bar-h, 86px)' }} />
        </div>
      </div>
    </>,
    document.getElementById('portal-root') as HTMLElement
  );
}
