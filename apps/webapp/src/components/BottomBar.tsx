import React from 'react';
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useCarouselStore, getStory, getSlidesCount } from '@/state/store';
import { exportSlides } from '@/features/carousel/utils/exportSlides';
import '../styles/bottom-bar.css';

// ---------- HAPTIC ----------
const haptic = {
  impact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback?.impactOccurred) {
        tg.HapticFeedback.impactOccurred(style);
        return true;
      }
    } catch {}
    if ('vibrate' in navigator) (navigator as any).vibrate?.(20);
    return false;
  },
};
const withHaptic =
  <T extends any[]>(fn: (...args: T) => void, style: Parameters<typeof haptic.impact>[0] = 'light') =>
  (...args: T) => {
    haptic.impact(style);
    fn(...args);
  };

// ---------- SHARE ----------
async function handleShare() {
  const tg = (window as any).Telegram?.WebApp;

  try {
    const story = getStory();
    const count = getSlidesCount();

    console.info('[share] slides in story =', count);

    if (!count) {
      tg?.showAlert?.('Добавьте текст или фотографию.');
      return;
    }

    const blobs = await exportSlides(story, { count });
    console.info('[share] blobs:', blobs.length);

    if (!blobs.length) {
      tg?.showAlert?.('Не удалось подготовить слайды. Попробуйте еще раз.');
      return;
    }

    const files = blobs.map(
      (b, i) =>
        new File([b], `slide-${String(i + 1).padStart(2, '0')}.png`, { type: 'image/png' }),
    );

    // 3) iOS/Android native share — если доступен
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files });
      return;
    }

    // 4) Фолбэк: скачать первый файл (минимально полезно)
    const url = URL.createObjectURL(files[0]);
    const a = document.createElement('a');
    a.href = url;
    a.download = files[0].name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[share] failed', e);
    (window as any).Telegram?.WebApp?.showAlert?.('Не удалось поделиться. Попробуйте ещё раз.');
  }
}

export default function BottomBar() {
  const openSheet = useCarouselStore((s) => s.openSheet);

  const actions = [
    { key: 'template', label: 'Template', icon: <IconTemplate /> },
    { key: 'layout', label: 'Layout', icon: <IconLayout /> },
    { key: 'fonts', label: 'Fonts', icon: <IconFonts /> },
    { key: 'photos', label: 'Photos', icon: <IconPhotos /> },
    { key: 'info', label: 'Info', icon: <IconInfo /> },
  ];

  return (
    <nav className="toolbar" role="toolbar">
      {actions.map((a) => (
        <button
          key={a.key}
          className="toolbar__btn"
          onClick={withHaptic(() => openSheet(a.key as any), 'light')}
        >
          <span className="toolbar__icon">{a.icon}</span>
          <span className="toolbar__label">{a.label}</span>
        </button>
      ))}

      <button className="toolbar__btn" onClick={withHaptic(handleShare, 'medium')} aria-label="Share">
        <span className="toolbar__icon">
          <ShareIcon />
        </span>
        <span className="toolbar__label">Share</span>
      </button>
    </nav>
  );
}
