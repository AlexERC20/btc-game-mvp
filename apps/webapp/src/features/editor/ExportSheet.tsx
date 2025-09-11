import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { exportSlides } from '../carousel/utils/exportSlides';

type Props = { isOpen: boolean; onClose: () => void; story: any };

export default function ExportSheet({ isOpen, onClose, story }: Props) {
  const [busy, setBusy] = useState(false);
  if (!isOpen) return null;

  async function getFiles() {
    const blobs = await exportSlides(story);
    return blobs.map((b, i) => new File([b], `slide-${i + 1}.png`, { type: 'image/png' }));
  }

  async function onSave() {
    setBusy(true);
    try {
      const blobs = await exportSlides(story);
      for (let i = 0; i < blobs.length; i++) {
        const url = URL.createObjectURL(blobs[i]);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slide-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    try {
      setBusy(true);
      const files = await getFiles();
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: 'Carousel' });
      } else {
        await onSave();
        return;
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet bottom-sheet" role="dialog" onClick={e => e.stopPropagation()}>
        <div className="sheet__header">
          <h3>Export</h3>
          <button className="sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sheet__body space-y-3 p-4">
          <button className="btn btn-primary w-full" onClick={onShare} disabled={busy}>
            Share…
          </button>
          <button className="btn w-full" onClick={onSave} disabled={busy}>
            Save to Photos
          </button>
          <p className="text-xs text-neutral-400">
            На iOS/Telegram WebView функция Share может быть недоступна — тогда сработает «Save to Photos».
          </p>
        </div>
      </div>
    </>,
    document.getElementById('portal-root') as HTMLElement
  );
}
