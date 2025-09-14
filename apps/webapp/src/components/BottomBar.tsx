import React from 'react';
import { IconTemplate, IconLayout, IconPhotos, IconFonts } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useCarouselStore, buildCurrentStory, getSlidesCount } from '@/state/store';
import { exportSlides } from '@/features/carousel/utils/exportSlides';
import { haptic, showAlertSafe } from '@/lib/tg';
import '../styles/bottom-bar.css';

function withHaptic<T extends any[]>(
  fn: (...args: T) => void,
  style: Parameters<typeof haptic.impact>[0] = 'light'
) {
  return (...args: T) => {
    haptic.impact(style);
    fn(...args);
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadOneByOne(files: File[]) {
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // маленькая пауза, чтобы iOS не «съедал» клики
    await sleep(200);
  }
}

async function handleShare() {
  try {
    const count = getSlidesCount();
    console.info('[share] slides count =', count);

    if (!count) {
      showAlertSafe('Добавьте текст или фотографию.');
      return;
    }

    // Всегда строим актуальную story из store
    const story = buildCurrentStory();

    const blobs = await exportSlides(story, { count });
    if (!blobs.length) {
      showAlertSafe('Не удалось подготовить слайды. Попробуйте ещё раз.');
      return;
    }

    const files: File[] = blobs.map(
      (b, i) =>
        new File([b], `slide-${String(i + 1).padStart(2, '0')}.png`, { type: 'image/png' })
    );

    // Безопасная проверка canShare (некоторые webview кидают тут исключение)
    let canShareFiles = false;
    try {
      canShareFiles = !!(navigator as any).canShare?.({ files });
    } catch {
      canShareFiles = false;
    }

    if (canShareFiles) {
      try {
        await (navigator as any).share({ files });
        return;
      } catch (err) {
        console.warn('[share] share() rejected, fallback to downloads', err);
        await downloadOneByOne(files);
        return;
      }
    }

    // Фолбэк по умолчанию
    await downloadOneByOne(files);
  } catch (e) {
    console.error('[share] failed', e);
    showAlertSafe('Не удалось поделиться. Попробуйте ещё раз.');
  }
}

export default function BottomBar() {
  const openSheet = useCarouselStore((s) => s.openSheet);

  const items = [
    { key: 'export',   label: 'Export',   icon: <ShareIcon />,    onClick: () => handleShare() },
    // Пока отдельного TextSheet нет — открываем старый лист, где вводится текст.
    { key: 'text',     label: 'Text',     icon: <IconFonts />,    onClick: () => openSheet('template') },
    { key: 'template', label: 'Template', icon: <IconTemplate />, onClick: () => openSheet('template') },
    { key: 'photos',   label: 'Photos',   icon: <IconPhotos />,   onClick: () => openSheet('photos') },
    { key: 'layout',   label: 'Layout',   icon: <IconLayout />,   onClick: () => openSheet('layout') },
  ] as const;

  return (
    <nav className="toolbar" role="toolbar">
      {items.map((i) => (
        <button
          key={i.key}
          className="toolbar__btn"
          onClick={withHaptic(i.onClick, i.key === 'export' ? 'medium' : 'light')}
        >
          <span className="toolbar__icon">{i.icon}</span>
          <span className="toolbar__label">{i.label}</span>
        </button>
      ))}
    </nav>
  );
}
