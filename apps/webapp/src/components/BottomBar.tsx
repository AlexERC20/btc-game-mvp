import React from 'react';
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useCarouselStore } from '@/state/store';
import { buildCurrentStory, getSlidesCount } from '@/state/store';
import { exportSlides } from '@/features/carousel/utils/exportSlides';
import { haptic, showAlertSafe } from '@/lib/tg';
import '../styles/bottom-bar.css';

function withHaptic<T extends any[]>(fn: (...args: T) => void, style: Parameters<typeof haptic.impact>[0] = 'light') {
  return (...args: T) => { haptic.impact(style); fn(...args); };
}

async function handleShare() {
  try {
    const count = getSlidesCount();
    console.info('[share] slides count =', count);

    if (!count) {
      showAlertSafe('Добавьте текст или фотографию.');
      return;
    }

    const story = buildCurrentStory();
    const blobs = await exportSlides(story, { count });

    if (!blobs?.length) {
      showAlertSafe('Не удалось подготовить слайды. Попробуйте ещё раз.');
      return;
    }

    // Собираем файлы
    const files = blobs.map((b, i) => new File([b], `slide-${String(i + 1).padStart(2, '0')}.png`, { type: 'image/png' }));

    // 1) Web Share API c файлами
    if (navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files });
        return;
      } catch (e) {
        // пользователь мог отменить — тихо падаем в фоллбек
        console.warn('[share] navigator.share failed, fallback to download', e);
      }
    }

    // 2) Фоллбек: скачиваем первый файл (или по одному в цикле — по желанию)
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
    // Никаких showPopup: только безопасный alert
    showAlertSafe('Не удалось поделиться. Попробуйте ещё раз.');
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
