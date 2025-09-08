import React from "react";

export default function BottomSheet({
  open, onClose, title, children
}:{open:boolean; onClose:()=>void; title:string; children:React.ReactNode}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose}/>
      <div className="fixed inset-x-0 bottom-0 z-50 bg-neutral-900 text-white rounded-t-2xl
                      border border-neutral-800 shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="p-4 border-b border-neutral-800 font-medium">{title}</div>
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </>
  );
}
