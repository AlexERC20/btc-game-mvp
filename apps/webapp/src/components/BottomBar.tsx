import React from 'react';
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useCarouselStore } from '@/state/store';
import { buildCurrentStory, getSlidesCount } from '@/state/store';
import { exportSlides } from '@/features/carousel/utils/exportSlides';
import { haptic, showAlertSafe } from '@/lib/tg';
import '../styles/bottom-bar.css';

async function handleShare() {
  try {
    haptic.impact('medium');

    const count = getSlidesCount();
    console.info('[share] slides count =', count);
    if (!count || count <= 0) {
      showAlertSafe('Добавьте текст или фотографию.');
      return;
    }

    const story = buildCurrentStory();
    const blobs = await exportSlides(story, { count });
    if (!blobs || !Array.isArray(blobs) || blobs.length === 0) {
      showAlertSafe('Не удалось подготовить слайды.');
      return;
    }

    const files: File[] = [];
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      if (!(b instanceof Blob)) continue;
      files.push(new File([b], `slide-${String(i + 1).padStart(2, '0')}.png`, { type: 'image/png' }));
    }
    if (files.length === 0) {
      showAlertSafe('Нет файлов для шаринга.');
      return;
    }

    // Web Share Level 2
    try {
      const canShareFiles =
        typeof (navigator as any).canShare === 'function' && (navigator as any).canShare({ files });
      if (canShareFiles && typeof (navigator as any).share === 'function') {
        await (navigator as any).share({ files }); // iOS покажет нативный шэр-шит
        return;
      }
    } catch (e) {
      console.warn('[share] native share failed, fallback to download', e);
    }

    // Фолбэк: последовательное скачивание
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const url = URL.createObjectURL(f);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // маленькая пауза помогает iOS
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 120));
    }
  } catch (err) {
    console.error('[share] failed', err);
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
      {actions.map((a) => (
        <button
          key={a.key}
          className="toolbar__btn"
          onClick={() => { haptic.impact('light'); openSheet(a.key as any); }}
        >
          <span className="toolbar__icon">{a.icon}</span>
          <span className="toolbar__label">{a.label}</span>
        </button>
      ))}

      <button className="toolbar__btn" onClick={handleShare} aria-label="Share">
        <span className="toolbar__icon"><ShareIcon /></span>
        <span className="toolbar__label">Share</span>
      </button>
    </nav>
  );
}

