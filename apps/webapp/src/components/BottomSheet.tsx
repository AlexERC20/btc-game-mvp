import React from "react";

export default function BottomSheet({
  open, onClose, title, children
}:{open:boolean; onClose:()=>void; title:string; children:React.ReactNode}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="absolute left-0 right-0 bottom-0 bg-neutral-900 text-white rounded-t-2xl
                      border border-neutral-800 shadow-2xl">
        <div className="p-4 border-b border-neutral-800 font-medium">{title}</div>
        <div className="p-4 space-y-3">{children}</div>
        <div className="h-3" />
      </div>
    </div>
  );
}
