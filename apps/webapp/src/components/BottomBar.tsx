import React from 'react';
import {
  IconTemplate,
  IconLayout,
  IconFonts,
  IconPhotos,
  IconInfo,
  IconExport,
} from '../ui/icons';

interface Props {
  onTemplate: () => void;
  onLayout: () => void;
  onFonts: () => void;
  onPhotos: () => void;
  onInfo: () => void;
  onExport: () => void;
  disabledExport?: boolean;
  active?: 'template' | 'layout' | 'fonts' | 'photos' | 'info';
}

export default function BottomBar({
  onTemplate,
  onLayout,
  onFonts,
  onPhotos,
  onInfo,
  onExport,
  disabledExport,
  active,
}: Props) {
  const Item = ({
    icon,
    label,
    onClick,
    disabled,
    isActive,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    isActive?: boolean;
  }) => (
    <button
      className={`toolbar__item ${isActive ? 'text-white' : 'text-white/70'}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={label}
    >
      <span className="toolbar__icon">{icon}</span>
      <span className="toolbar__label">{label}</span>
    </button>
  );

  return (
    <div className="toolbar fixed inset-x-4 bottom-6 z-[60] rounded-2xl backdrop-blur-xl bg-black/50 ring-1 ring-white/10 p-10">
      <div className="grid grid-cols-6 gap-8">
        <Item icon={<IconTemplate className="h-6 w-6" />} label="Template" onClick={onTemplate} isActive={active === 'template'} />
        <Item icon={<IconLayout className="h-6 w-6" />} label="Layout" onClick={onLayout} isActive={active === 'layout'} />
        <Item icon={<IconFonts className="h-6 w-6" />} label="Fonts" onClick={onFonts} isActive={active === 'fonts'} />
        <Item icon={<IconPhotos className="h-6 w-6" />} label="Photos" onClick={onPhotos} isActive={active === 'photos'} />
        <Item icon={<IconInfo className="h-6 w-6" />} label="Info" onClick={onInfo} isActive={active === 'info'} />
        <Item icon={<IconExport className="h-6 w-6" />} label="Export" onClick={onExport} disabled={disabledExport} />
      </div>
    </div>
  );
}
