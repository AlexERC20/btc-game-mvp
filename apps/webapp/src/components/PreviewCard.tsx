import React, { useRef, useState } from 'react';
import '../styles/preview-card.css';

type Props = {
  mode: 'carousel' | 'story'; // 4:5 | 9:16
  image?: string;
  text: string;
  username: string;
  textPosition?: 'bottom' | 'top';
  index?: number;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDelete?: (index: number) => void;
} & React.HTMLAttributes<HTMLDivElement>;

export const PreviewCard: React.FC<Props> = ({
  mode,
  image,
  text,
  username,
  textPosition = 'bottom',
  index,
  onMoveUp,
  onMoveDown,
  onDelete,
  style,
  ...rest
}) => {
  const ratio = mode === 'story' ? '9 / 16' : '4 / 5';
  const ACTION_WIDTH = 144; // ширина панели действий
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX - offset;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffset(Math.min(0, Math.max(dx, -ACTION_WIDTH)));
  };

  const handleTouchEnd = () => {
    setOffset(prev => (prev < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0));
    startX.current = null;
  };

  const handleAction = (fn?: (i: number) => void) => {
    if (typeof index !== 'number' || !fn) return;
    fn(index);
    setOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => handleAction(onMoveUp)}
          className="w-12 bg-neutral-800 text-neutral-100"
        >
          ↑
        </button>
        <button
          onClick={() => handleAction(onMoveDown)}
          className="w-12 bg-neutral-800 text-neutral-100"
        >
          ↓
        </button>
        <button
          onClick={() => handleAction(onDelete)}
          className="w-12 bg-red-700 text-neutral-100"
        >
          ✕
        </button>
      </div>
      <div
        className="preview-card"
        style={{
          // основное — держит размер всегда
          '--ratio': ratio,
          transform: `translateX(${offset}px)`,
          ...((style ?? {}) as React.CSSProperties),
        } as React.CSSProperties}
        data-mode={mode}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...rest}
      >
        {/* Fallback для браузеров без aspect-ratio */}
        <div className="preview-card__ratio-fallback" aria-hidden />

        {/* Фото */}
        {image && (
          <img className="preview-card__img" src={image} alt="" />
        )}

        {/* Текст */}
        <div
          className={`preview-card__text preview-card__text--${textPosition}`}
        >
          {text}
        </div>

        {/* Ник (всегда левый нижний) */}
        <div className="preview-card__username">@{username}</div>

        {/* Пэйджер (опционально) */}
        {/* <div className="preview-card__pager">1/5 →</div> */}
      </div>
    </div>
  );
};

export default PreviewCard;

