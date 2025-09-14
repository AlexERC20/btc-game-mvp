import React from 'react';
import { useCarouselStore } from '@/state/store';
import '../../styles/bottom-sheet.css';

export default function TextSheet() {
  const slides = useCarouselStore((s) => s.slides);
  const active = useCarouselStore((s) => s.activeIndex);
  const update = useCarouselStore((s) => s.updateSlide);

  const slide = slides[active];

  return (
    <div className="sheet">
      <div className="sheet__title">Text</div>
      <textarea
        className="sheet__textarea"
        value={slide?.body ?? ''}
        placeholder="Вставь текст сюда…"
        onChange={(e) => slide && update(slide.id, { body: e.target.value })}
        rows={8}
      />
      <label className="sheet__field">
        <span>@username</span>
        <input
          value={slide?.nickname ?? ''}
          onChange={(e) => slide && update(slide.id, { nickname: e.target.value })}
        />
      </label>
    </div>
  );
}

