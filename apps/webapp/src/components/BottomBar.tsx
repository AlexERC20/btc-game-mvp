import React from 'react';
import { useCarouselStore } from '@/state/store';
import { exportSlides } from '@/features/carousel/utils/exportSlides';

// иконка экспорта — оставьте ваш компонент/путь, если отличается
import DownloadIcon from '@/icons/DownloadIcon';

/**
 * ВНИМАНИЕ: кнопка Export делает только share-sheet (если доступен)
 * или fallback на последовательные загрузки PNG. Никаких модалок.
 */
export default function BottomBar() {
  const story = useCarouselStore((s) => s.story);
  const uiOptions = useCarouselStore((s) => s.uiOptions);

  const onExport = async () => {
    try {
      const blobs = await exportSlides(story, uiOptions);
      const files = blobs.map(
        (b, i) => new File([b], `slide-${i + 1}.png`, { type: 'image/png' })
      );

      // 1) Современный путь: системное меню «Поделиться»
      if (navigator.canShare?.({ files }) && typeof navigator.share === 'function') {
        await navigator.share({
          files,
          title: 'Carousel',
          text: 'Slides',
        });
        return;
      }

      // 2) Фолбэк: поочерёдные загрузки PNG
      for (let i = 0; i < files.length; i++) {
        const url = URL.createObjectURL(files[i]);
        const a = document.createElement('a');
        a.href = url;
        a.download = files[i].name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // маленькая задержка, чтобы iOS не «склеивал» клики
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 120));
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  return (
    <div className="toolbar">
      {/* остальные кнопки Template / Layout / Fonts / Photos / Info — НЕ трогаем */}
      <button
        type="button"
        className="toolbar__btn"
        onClick={onExport}
        aria-label="Export"
      >
        <span className="toolbar__icon">
          <DownloadIcon />
        </span>
        <span className="toolbar__label">Export</span>
      </button>
    </div>
  );
}