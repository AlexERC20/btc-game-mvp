import React from "react";
import {
  IconTemplate,
  IconLayout,
  IconFonts,
  IconPhotos,
  IconInfo,
  IconExport,
} from "../ui/icons";

export default function BottomBar({
  onTemplate, onLayout, onFonts, onPhotos, onInfo, onExport, disabledExport, active,
}:{
  onTemplate: ()=>void;
  onLayout: ()=>void;
  onFonts: ()=>void;
  onPhotos: ()=>void;
  onInfo: ()=>void;
  onExport: ()=>void;
  disabledExport?: boolean;
  active?: 'template'|'layout'|'fonts'|'photos'|'info';
}) {
  const Item = ({icon,label,onClick,disabled,active}:{icon:React.ReactNode,label:string,onClick?:()=>void,disabled?:boolean,active?:boolean}) => (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className={`w-full h-11 flex items-center justify-center gap-2 rounded-lg text-xs cursor-pointer select-none transition-transform ${disabled?"opacity-40":"hover:opacity-90 active:opacity-90 hover:-translate-y-px active:-translate-y-px active:scale-[0.96]"} ${active?"text-[var(--fg)]":"text-[var(--fg-muted)]"}`}>
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
      <div className="fixed left-0 right-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl">
        <div className="m-3 rounded-2xl border border-neutral-800 bg-neutral-900/85 backdrop-blur px-3 py-2 grid grid-cols-6 gap-1">
          <Item icon={<IconTemplate size={22} />} label="Template" onClick={onTemplate} active={active==='template'}/>
          <Item icon={<IconLayout size={22} />}  label="Layout"   onClick={onLayout} active={active==='layout'}/>
          <Item icon={<IconFonts size={22} />}   label="Fonts"    onClick={onFonts} active={active==='fonts'}/>
          <Item icon={<IconPhotos size={22} />}  label="Photos"   onClick={onPhotos} active={active==='photos'}/>
          <Item icon={<IconInfo size={22} />}    label="Info"     onClick={onInfo} active={active==='info'}/>
          <Item icon={<IconExport size={22} />}  label="Export"   onClick={onExport} disabled={disabledExport}/>
        </div>
      </div>
    </div>
  );
}
