import { type KeyboardEvent } from 'react';
import { FONTS, type FontId } from '@/features/fonts/fonts';
import { useFontStore } from '@/state/store';
import './FontPicker.css';

export function FontPicker() {
  const fontId = useFontStore((state) => state.fontId);
  const setFont = useFontStore((state) => state.setFont);

  const onSelect = (id: FontId) => {
    setFont(id);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate?.(10);
      } catch {}
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % FONTS.length;
      onSelect(FONTS[next].id);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (index - 1 + FONTS.length) % FONTS.length;
      onSelect(FONTS[prev].id);
    }
  };

  return (
    <div className="font-picker" role="radiogroup" aria-label="Font">
      {FONTS.map((font, index) => {
        const active = font.id === fontId;
        return (
          <button
            key={font.id}
            role="radio"
            aria-checked={active}
            className={`font-pill${active ? ' is-active' : ''}`}
            onClick={() => onSelect(font.id)}
            style={{ fontFamily: font.cssStack }}
            title={font.label}
            type="button"
            tabIndex={active ? 0 : -1}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {font.label}
          </button>
        );
      })}
    </div>
  );
}
