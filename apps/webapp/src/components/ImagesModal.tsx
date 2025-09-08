import React, {useState, useRef} from "react";

type Img = { id:string; url:string };

export default function ImagesModal({
  open, onClose, images, setImages
}:{
  open:boolean; onClose:()=>void;
  images: Img[]; setImages:(imgs:Img[])=>void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number|null>(null);

  if (!open) return null;

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr: Promise<Img>[] = Array.from(files).map(
      f => new Promise(resolve=>{
        const r = new FileReader();
        r.onload = ()=> resolve({ id: crypto.randomUUID(), url: String(r.result) });
        r.readAsDataURL(f);
      })
    );
    Promise.all(arr).then(newImgs => setImages([...images, ...newImgs]));
  };

  const remove = (id:string) => setImages(images.filter(i=>i.id!==id));

  const onDragStart = (idx:number)=> setDragIdx(idx);
  const onDragOver  = (e:React.DragEvent, idx:number)=> {
    e.preventDefault();
    if (dragIdx===null || dragIdx===idx) return;
    const copy = [...images];
    const [m] = copy.splice(dragIdx,1);
    copy.splice(idx,0,m);
    setImages(copy);
    setDragIdx(idx);
  };
  const onDragEnd = ()=> setDragIdx(null);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="absolute left-0 right-0 bottom-0 top-16 bg-neutral-950 text-white rounded-t-2xl
                      border border-neutral-800 shadow-2xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Photos</div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700"
                    onClick={()=>fileRef.current?.click()}>Add</button>
            <button className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700"
                    onClick={onClose}>Done</button>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
               onChange={e=>onFiles(e.target.files)} />

        <div className="grid grid-cols-3 gap-3">
          {images.map((img,idx)=>(
            <div key={img.id} draggable
                 onDragStart={()=>onDragStart(idx)}
                 onDragOver={(e)=>onDragOver(e, idx)}
                 onDragEnd={onDragEnd}
                 className="relative rounded-lg overflow-hidden border border-neutral-700">
              <img src={img.url} className="w-full h-28 object-cover" />
              <button onClick={()=>remove(img.id)}
                      className="absolute top-1 right-1 text-xs bg-black/60 rounded px-2 py-0.5">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
