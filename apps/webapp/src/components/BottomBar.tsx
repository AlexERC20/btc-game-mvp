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
  onTemplate,
  onLayout,
  onFonts,
  onPhotos,
  onInfo,
  onExport,
  disabledExport,
  active,
}: {
  onTemplate: () => void;
  onLayout: () => void;
  onFonts: () => void;
  onPhotos: () => void;
  onInfo: () => void;
  onExport: () => void;
  disabledExport?: boolean;
  active?: "template" | "layout" | "fonts" | "photos" | "info";
}) {
  const Item = ({
    icon,
    label,
    onClick,
    disabled,
    active,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    active?: boolean;
  }) => (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80 ${
        active ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"
      }`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="m-3 rounded-2xl border border-neutral-800 bg-neutral-900/85 backdrop-blur px-3 py-2 grid grid-cols-6 gap-1">
        <Item icon={<IconTemplate className="h-6 w-6" />} label="Template" onClick={onTemplate} active={active === "template"} />
        <Item icon={<IconLayout className="h-6 w-6" />} label="Layout" onClick={onLayout} active={active === "layout"} />
        <Item icon={<IconFonts className="h-6 w-6" />} label="Fonts" onClick={onFonts} active={active === "fonts"} />
        <Item icon={<IconPhotos className="h-6 w-6" />} label="Photos" onClick={onPhotos} active={active === "photos"} />
        <Item icon={<IconInfo className="h-6 w-6" />} label="Info" onClick={onInfo} active={active === "info"} />
        <Item icon={<IconExport className="h-6 w-6" />} label="Export" onClick={onExport} disabled={disabledExport} />
      </div>
    </div>
  );
}
