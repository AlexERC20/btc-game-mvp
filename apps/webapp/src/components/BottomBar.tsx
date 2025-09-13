import React from 'react';
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useCarouselStore, getStory } from '@/state/store';
import { exportSlides } from '@/features/carousel/utils/exportSlides';
import '../styles/bottom-bar.css';

// Хаптик: Telegram WebApp (если есть) → fallback вибрация
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
      (navigator as any).vibrate?.(20);
      return true;
    }
    return false;
  },
};

function withHaptic<T extends any[]>(fn: (...args: T) => void, style: Parameters<typeof haptic.impact>[0] = 'light') {
  return (...args: T) => {
    haptic.impact(style);
    fn(...args);
  };
}

async function handleShare() {
  try {
    // 1) берем актуальный state в момент клика
    const state = useCarouselStore.getState();
    const story = state.story;
    const slidesCount = story?.slides?.length ?? 0;

    console.info('[share] slides in story =', slidesCount);

    if (!slidesCount) {
      (window as any).Telegram?.WebApp?.showAlert?.('Добавьте текст или фотографию.');
      return;
    }

    // 2) на всякий случай дождёмся шрифтов
    try { await (document as any).fonts?.ready; } catch {}

    // 3) рендерим
    const blobs = await exportSlides(story);
    console.info('[share] produced blobs =', blobs.length);

    if (!blobs.length) {
      (window as any).Telegram?.WebApp?.showAlert?.('Не удалось подготовить слайды. Добавьте текст/фото.');
      return;
    }

    // 4) собираем File[] для Web Share API
    const files = blobs.map(
      (b, i) => new File([b], `slide-${String(i + 1).padStart(2, '0')}.png`, { type: 'image/png' })
    );

    // 5) Web Share API (если доступен)
    if ((navigator as any).canShare?.({ files }) && (navigator as any).share) {
      await (navigator as any).share({ files });
      return;
    }

    // 6) Фолбэк: отдаем первый файл как download
    const url = URL.createObjectURL(files[0]);
    const a = document.createElement('a');
    a.href = url;
    a.download = files[0].name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[share] failed:', e);
    (window as any).Telegram?.WebApp?.showAlert?.('Не удалось поделиться. Попробуйте ещё раз.');
  }
}

export default function BottomBar() {
  const openSheet = useCarouselStore((s) => s.openSheet);

  const actions = [
    { key: 'template', label: 'Template', icon: <IconTemplate /> },
    { key: 'layout',   label: 'Layout',   icon: <IconLayout /> },
    { key: 'fonts',    label: 'Fonts',    icon: <IconFonts /> },
    { key: 'photos',   label: 'Photos',   icon: <IconPhotos /> },
    { key: 'info',     label: 'Info',     icon: <IconInfo /> },
  ];

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
        onClick={withHaptic(handleShare, 'medium')}
        aria-label="Share"
      >
        <span className="toolbar__icon"><ShareIcon /></span>
        <span className="toolbar__label">Share</span>
      </button>
    </nav>
  );
}
