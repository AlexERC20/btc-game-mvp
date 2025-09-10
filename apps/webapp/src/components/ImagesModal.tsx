import React, { useRef } from "react";
import type { PhotoMeta } from "../types";

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

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={onClose}
      />
      <div
        className="absolute left-0 right-0 bottom-0 top-16 bg-neutral-950 text-white rounded-t-2xl border border-neutral-800 shadow-2xl p-4 overflow-y-auto pb-[calc(16px+env(safe-area-inset-bottom))] pointer-events-auto"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-neutral-800/80 text-white text-sm"
        >
          Done
        </button>
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Photos</div>
          <button
            className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700"
            onClick={() => fileRef.current?.click()}
          >
            Add photo
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

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((p, idx) => (
            <div
              key={p.id}
              className="relative rounded-lg overflow-hidden border border-neutral-700"
            >
              <img
                src={p.url}
                className="w-full aspect-square object-cover"
                onClick={() => onSelect(p.id)}
              />
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
    </div>
  );
}

