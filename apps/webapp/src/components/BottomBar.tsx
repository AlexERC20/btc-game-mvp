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

export default function BottomBar({
  disabledExport,
  onExport,
}: {
  disabledExport?: boolean;
  onExport: () => void;
}) {
  const openSheet = useStore(s => s.openSheet);
  const setOpenSheet = useStore(s => s.setOpenSheet);

  const Item = ({
    icon,
    label,
    name,
    disabled,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    name?: typeof openSheet;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      className={
        `flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[64px] text-[12px] leading-4 ${
          openSheet === name ? 'text-white' : 'text-white/90 hover:text-white'
        }`
      }
      onClick={
        disabled
          ? undefined
          : onClick
          ? onClick
          : name
          ? () => setOpenSheet(name)
          : undefined
      }
      disabled={disabled}
      aria-label={label}
    >
      <span className="h-6 w-6 flex items-center justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="toolbar fixed left-1/2 -translate-x-1/2 bottom-5 z-[60] rounded-2xl bg-black/60 backdrop-blur-xl ring-1 ring-white/10 px-3 py-2 w-[min(680px,92vw)]">
      <div className="grid grid-cols-6 gap-2">
        <Item icon={<IconTemplate className="h-6 w-6" />} label="Template" name="template" />
        <Item icon={<IconLayout className="h-6 w-6" />} label="Layout" name="layout" />
        <Item icon={<IconFonts className="h-6 w-6" />} label="Fonts" name="fonts" />
        <Item icon={<IconPhotos className="h-6 w-6" />} label="Photos" name="photos" />
        <Item icon={<IconInfo className="h-6 w-6" />} label="Info" name="info" />
        <Item
          icon={<IconExport className="h-6 w-6" />}
          label="Export"
          disabled={disabledExport}
          onClick={onExport}
        />
      </div>
    </div>
  );
}
