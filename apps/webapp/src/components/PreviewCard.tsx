import React, { useRef, useState } from 'react';
import '../styles/preview-card.css';
import { IconMoveUp, IconMoveDown, IconTrash, IconGrip } from '../ui/icons';

type Props = {
  mode: 'carousel' | 'story'; // 4:5 | 9:16
  image?: string;
  text: string;
  username: string;
  textPosition?: 'bottom' | 'top';
  index?: number;
  onReorder?: (from: number, to: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
} & React.HTMLAttributes<HTMLDivElement>;

export const PreviewCard: React.FC<Props> = ({
  mode,
  image,
  text,
  username,
  textPosition = 'bottom',
  index,
  onReorder,
  onMoveUp,
  onMoveDown,
  onDelete,
  style,
  ...rest
}) => {
  const ratio = mode === 'story' ? '9 / 16' : '4 / 5';
  const [show, setShow] = useState(false);
  const startX = useRef<number | null>(null);

  const handleStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const handleEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -30) setShow(true);
    if (dx > 30) setShow(false);
    startX.current = null;
  };

  return (
    <div
      className="preview-card"
      style={{
        // основное — держит размер всегда
        '--ratio': ratio,
        ...((style ?? {}) as React.CSSProperties),
      } as React.CSSProperties}
      data-mode={mode}
      draggable={typeof index === 'number'}
      onDragStart={typeof index === 'number' ? (e => {
        e.dataTransfer.setData('text/plain', String(index));
      }) : undefined}
      onDragOver={typeof index === 'number' ? (e => e.preventDefault()) : undefined}
      onDrop={typeof index === 'number' && onReorder ? (e => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData('text/plain'));
        const to = index!;
        if (!Number.isNaN(from) && from !== to) onReorder(from, to);
      }) : undefined}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
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

      <div className={`preview-card__actions ${show ? 'preview-card__actions--show' : ''}`}>
        <IconGrip size={20} className="mb-1" />
        <button aria-label="Move up" onClick={onMoveUp} onDragStart={e=>e.stopPropagation()} className="w-11 h-11 flex items-center justify-center active:scale-[0.96]">
          <IconMoveUp size={20} />
        </button>
        <button aria-label="Move down" onClick={onMoveDown} onDragStart={e=>e.stopPropagation()} className="w-11 h-11 flex items-center justify-center active:scale-[0.96]">
          <IconMoveDown size={20} />
        </button>
        <button aria-label="Delete" onClick={onDelete} onDragStart={e=>e.stopPropagation()} className="w-11 h-11 flex items-center justify-center text-[var(--danger)] active:scale-[0.96]">
          <IconTrash size={20} />
        </button>
      </div>
    </div>
  );
};

export default PreviewCard;

