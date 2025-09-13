import React, { useState } from 'react';
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useCarouselStore } from '@/state/store';
import { exportSlides } from '@/features/carousel/utils/exportSlides';
import '../styles/bottom-bar.css';

// Хаптик: Telegram WebApp (iOS/Android) → fallback на Vibration API (Android)
const haptic = {
  impact(style: 'light'|'medium'|'heavy'|'rigid'|'soft' = 'light') {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback?.impactOccurred) {
        tg.HapticFeedback.impactOccurred(style);
        return true;
      }
    } catch {}
    if ('vibrate' in navigator) {
      // короткий «тик», чтобы не раздражал
      (navigator as any).vibrate?.(20);
      return true;
    }
    return false;
  },
  selection() {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback?.selectionChanged) {
        tg.HapticFeedback.selectionChanged();
        return true;
      }
    } catch {}
    return false;
  },
};

function withHaptic<T extends any[]>(fn: (...args: T) => void, style: Parameters<typeof haptic.impact>[0] = 'light') {
  return (...args: T) => {
    haptic.impact(style);
    fn(...args);
  };
}

export default function BottomBar() {
  const openSheet = useCarouselStore((s) => s.openSheet);
  const [busy, setBusy] = useState(false);

  const actions = [
    { key: 'template', label: 'Template', icon: <IconTemplate /> },
    { key: 'layout',   label: 'Layout',   icon: <IconLayout /> },
    { key: 'fonts',    label: 'Fonts',    icon: <IconFonts /> },
    { key: 'photos',   label: 'Photos',   icon: <IconPhotos /> },
    { key: 'info',     label: 'Info',     icon: <IconInfo /> },
  ];

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const story = useCarouselStore.getState().story;
      const blobs = await exportSlides(story);
      console.info('[share] rendered blobs:', blobs.length);

      if (!blobs.length) {
        console.info('[share] no files to share');
        return;
      }

      const files = blobs.map((b, i) => new File([b], `slide-${i + 1}.png`, { type: 'image/png' }));

      const canShareFiles = !!navigator.canShare?.({ files });
      const hasShare = typeof navigator.share === 'function';

      console.info('[share] support:', { hasShare, hasCanShare: !!navigator.canShare, filesCount: files.length });

      if (canShareFiles && hasShare) {
        try {
          await navigator.share({ files });
          return;
        } catch (e: any) {
          if (e?.name !== 'AbortError') console.warn('[share] share failed, fallback to download', e);
          if (e?.name === 'AbortError') return;
        }
      }

      for (const file of files) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('[share] failed', e);
      alert('Не удалось поделиться. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <nav className="toolbar" role="toolbar">
      {actions.map(a => (
        <button
          key={a.key}
          className="toolbar__btn"
          onClick={withHaptic(() => openSheet(a.key as any), 'light')}
        >
          <span className="toolbar__icon">{a.icon}</span>
          <span className="toolbar__label">{a.label}</span>
        </button>
      ))}
      <button
        className="toolbar__btn"
        onClick={withHaptic(onShare, 'medium')}
        aria-label="Share"
      >
        <span className="toolbar__icon">
          <ShareIcon />
        </span>
        <span className="toolbar__label">Share</span>
      </button>
    </nav>
  );
}
