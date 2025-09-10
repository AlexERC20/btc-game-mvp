import React from 'react';
import {
  IconTemplate,
  IconLayout,
  IconFonts,
  IconPhotos,
  IconInfo,
  IconExport,
} from '../ui/icons';
import { useStore } from '../state/store';

export default function BottomBar({ disabledExport }: { disabledExport?: boolean }) {
  const openSheet = useStore(s => s.openSheet);
  const setOpenSheet = useStore(s => s.setOpenSheet);

  const Item = ({
    icon,
    label,
    name,
    disabled,
  }: {
    icon: React.ReactNode;
    label: string;
    name: typeof openSheet;
    disabled?: boolean;
  }) => (
    <button
      className={
        'toolbar__btn' + (openSheet === name ? ' text-white' : ' text-white/70')
      }
      onClick={disabled ? undefined : () => setOpenSheet(name)}
      disabled={disabled}
      aria-label={label}
    >
      <span className="toolbar__icon">{icon}</span>
      <span className="toolbar__label">{label}</span>
    </button>
  );

  return (
    <div className="toolbar fixed inset-x-0 bottom-0 z-[60] p-4 pb-[env(safe-area-inset-bottom,0px)] bg-black/60 backdrop-blur-xl">
      <Item icon={<IconTemplate className="h-6 w-6" />} label="Template" name="template" />
      <Item icon={<IconLayout className="h-6 w-6" />} label="Layout" name="layout" />
      <Item icon={<IconFonts className="h-6 w-6" />} label="Fonts" name="fonts" />
      <Item icon={<IconPhotos className="h-6 w-6" />} label="Photos" name="photos" />
      <Item icon={<IconInfo className="h-6 w-6" />} label="Info" name="info" />
      <Item icon={<IconExport className="h-6 w-6" />} label="Export" name="export" disabled={disabledExport} />
    </div>
  );
}
