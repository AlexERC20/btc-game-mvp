import React, { useRef } from 'react';

export function PhotosPicker({ onPick }: { onPick: (urls: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const trigger = () => inputRef.current?.click();

  const onChange = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const data = await new Promise<string>(res => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      urls.push(data);
    }
    onPick(urls);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => onChange(e.target.files)}
      />
      <button type="button" onClick={trigger} className="btn btn-secondary">
        Add photo
      </button>
    </>
  );
}
