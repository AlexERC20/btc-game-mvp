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
import { exportSlides } from '../features/carousel/utils/exportSlides';

export default function BottomBar({
  disabledExport,
  onExport: _legacyOnExport,
  exporting: _legacyExporting,
}: {
  disabledExport?: boolean;
  onExport?: () => void;
  exporting?: boolean;
}) {
  const openSheet = useStore(s => s.openSheet);
  const setOpenSheet = useStore(s => s.setOpenSheet);
  const slides = useStore(s => s.slides);
  const mode = useStore(s => s.mode);
  const [exporting, setExporting] = React.useState(false);

  async function onExport() {
    if (exporting || !slides.length) return;
    setExporting(true);
    try {
      const uiOptions =
        mode === 'story'
          ? { width: 1080, height: 1920 }
          : { width: 1080, height: 1350 };
      const story = { slides };
      const blobs = await exportSlides(story as any, uiOptions);
      const files = blobs.map(
        (b, i) => new File([b], `slide-${i + 1}.png`, { type: 'image/png' })
      );

      if (navigator.canShare?.({ files }) && typeof navigator.share === 'function') {
        await navigator.share({ files, title: 'Carousel', text: 'Slides' });
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const url = URL.createObjectURL(files[i]);
        const a = document.createElement('a');
        a.href = url;
        a.download = files[i].name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 120));
      }
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(false);
    }
  }

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
      className={`toolbar__item ${
        openSheet === name ? 'text-white' : 'text-white/90 hover:text-white'
      }`}
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
      <span className="toolbar__icon">{icon}</span>
      <span className="toolbar__label">{label}</span>
    </button>
  );

  return (
    <div className="toolbar">
      <Item icon={<IconTemplate />} label="Template" name="template" />
      <Item icon={<IconLayout />} label="Layout" name="layout" />
      <Item icon={<IconFonts />} label="Fonts" name="fonts" />
      <Item icon={<IconPhotos />} label="Photos" name="photos" />
      <Item icon={<IconInfo />} label="Info" name="info" />
      <Item
        icon={
          exporting ? (
            <span className="toolbar__icon">
              <svg
                className="animate-spin"
                viewBox="0 0 24 24"
                width="22"
                height="22"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </span>
          ) : (
            <IconExport />
          )
        }
        label="Export"
        disabled={disabledExport || exporting}
        onClick={onExport}
      />
    </div>
  );
}
