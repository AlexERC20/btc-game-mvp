import React from "react";
import TemplateIcon from "../icons/TemplateIcon";
import PaletteIcon from "../icons/PaletteIcon";
import LayoutIcon from "../icons/LayoutIcon";
import CameraIcon from "../icons/CameraIcon";
import InfoIcon from "../icons/InfoIcon";
import DownloadIcon from "../icons/DownloadIcon";

export default function BottomBar({
  onTemplate, onColor, onLayout, onPhotos, onInfo, onExport, disabledExport
}:{
  onTemplate: ()=>void;
  onColor: ()=>void;
  onLayout: ()=>void;
  onPhotos: ()=>void;
  onInfo: ()=>void;
  onExport: ()=>void;
  disabledExport?: boolean;
}) {
  const Item = ({icon,label,onClick,disabled}:{icon:React.ReactNode,label:string,onClick?:()=>void,disabled?:boolean}) => (
    <button onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center justify-center h-14 rounded-xl text-xs
        ${disabled ? "opacity-40" : "hover:bg-neutral-800/60 active:scale-[0.98] transition"}`}>
      <div className="h-6 w-6 text-neutral-100">{icon}</div>
      <div className="text-neutral-200 mt-1">{label}</div>
    </button>
  );

  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl">
        <div className="m-3 rounded-2xl border border-neutral-800 bg-neutral-900/85 backdrop-blur px-3 py-2 grid grid-cols-6 gap-1">
          <Item icon={<TemplateIcon className="w-6 h-6"/>} label="Template" onClick={onTemplate}/>
          <Item icon={<PaletteIcon className="w-6 h-6"/>}  label="Color"    onClick={onColor}/>
          <Item icon={<LayoutIcon className="w-6 h-6"/>}   label="Layout"   onClick={onLayout}/>
          <Item icon={<CameraIcon className="w-6 h-6"/>}   label="Photos"   onClick={onPhotos}/>
          <Item icon={<InfoIcon className="w-6 h-6"/>}     label="Info"     onClick={onInfo}/>
          <Item icon={<DownloadIcon className="w-6 h-6"/>} label="Export"   onClick={onExport} disabled={disabledExport}/>
        </div>
      </div>
    </div>
  );
}
