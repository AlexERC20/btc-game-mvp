import React from 'react';
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useCarouselStore, getStory } from '@/state/store';
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
    if ('vibrate' in navigator) {
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

function withHaptic<T extends any[]>(
  fn: (...args: T) => void | Promise<void>,
  style: Parameters<typeof haptic.impact>[0] = 'light',
) {
  return (...args: T) => {
    haptic.impact(style);
    return fn(...args);
  };
}

// ---------- SHARE ----------
async function handleShare() {
  const tg = (window as any).Telegram?.WebApp;

  try {
    // 1) Берём story корректно из zustand (fallback на getStory, если он есть)
    const storeState = (useCarouselStore as any)?.getState?.();
    const story =
      storeState?.story ??
      (typeof getStory === 'function' ? (getStory as unknown as () => any)() : undefined);

    const slidesLen = Array.isArray(story?.slides) ? story.slides.length : 0;
    if (!slidesLen) {
      tg?.showAlert?.('Добавьте хотя бы один слайд');
      return;
    }

    // 2) Рендерим PNG (без ZIP), размеры можно не задавать — рендер учитывает текущий layout
    const blobs = await exportSlides(story);
    console.info('[share] blobs:', blobs.length);

    if (!blobs?.length) {
      tg?.showAlert?.('Не удалось подготовить слайды. Добавьте текст/фото.');
      return;
    }

    // 3) File[] для Web Share API
    const files = blobs.map(
      (b, i) =>
        new File([b], `slide-${String(i + 1).padStart(2, '0')}.png`, {
          type: 'image/png',
        }),
    );

    // 3a) Нативный share sheet, если поддерживается
    const canNativeShare = typeof (navigator as any).canShare === 'function'
      ? (navigator as any).canShare({ files })
      : false;

    if (canNativeShare && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({ files });
        return;
      } catch (err) {
        // пользователь мог отменить — пойдём в фолбэк
        console.warn('[share] navigator.share error', err);
      }
    }

    // 3b) Telegram shareToStory (если доступно) и один файл
    if (tg?.shareToStory && files.length === 1) {
      const url = URL.createObjectURL(files[0]);
      try {
        await tg.shareToStory(url);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        URL.revokeObjectURL(url);
        console.warn('[share] shareToStory error', err);
      }
    }

    // 3c) Фолбэк: скачиваем все PNG по одному
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      await new Promise((r) => setTimeout(r, 120));
    }

    tg?.showAlert?.('Изображения сохранены. Теперь можно поделиться вручную.');
  } catch (e) {
    console.error('[share] failed', e);
    // ВАЖНО: никаких showPopup — в v6.0 его нет
    (window as any).Telegram?.WebApp?.showAlert?.('Не удалось поделиться. Попробуйте ещё раз.');
  }
}

// ---------- UI ----------
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
          aria-label={a.label}
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
        <span className="toolbar__icon">
          <ShareIcon />
        </span>
        <span className="toolbar__label">Share</span>
      </button>
    </nav>
  );
}
