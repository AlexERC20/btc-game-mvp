import React, { useRef, useState } from "react";

export default function ImagesModal({
  open,
  onClose,
  onConfirm,
}:{
  open: boolean;
  onClose: () => void;
  onConfirm: (urls: string[]) => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr: Promise<string>[] = Array.from(files).map(
      f => new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(f);
      })
    );
    Promise.all(arr).then(urls => setImages(prev => [...prev, ...urls]));
  };

  const remove = (idx: number) => setImages(images.filter((_, i) => i !== idx));

  const confirm = () => {
    onConfirm(images);
    onClose();
    setImages([]);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="absolute left-0 right-0 bottom-0 top-16 bg-neutral-950 text-white rounded-t-2xl border border-neutral-800 shadow-2xl p-4 overflow-y-auto pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Photos</div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700" onClick={()=>fileRef.current?.click()}>Add</button>
            <button className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700" onClick={confirm}>Done</button>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>onFiles(e.target.files)} />

        <div className="grid grid-cols-3 gap-3">
          {images.map((url,idx)=>(
            <div key={idx} className="relative rounded-lg overflow-hidden border border-neutral-700">
              <img src={url} className="w-full h-28 object-cover" />
              <button onClick={()=>remove(idx)} className="absolute top-1 right-1 text-xs bg-black/60 rounded px-2 py-0.5">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
