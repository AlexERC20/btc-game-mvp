import React from 'react';
import '../styles/preview-card.css';

type Props = {
  mode: 'carousel' | 'story'; // 4:5 | 9:16
  image?: string;
  text: string;
  username: string;
  textPosition?: 'bottom' | 'top';
  index?: number;
  onReorder?: (from: number, to: number) => void;
} & React.HTMLAttributes<HTMLDivElement>;

export const PreviewCard: React.FC<Props> = ({
  mode,
  image,
  text,
  username,
  textPosition = 'bottom',
  index,
  onReorder,
  style,
  ...rest
}) => {
  const ratio = mode === 'story' ? '9 / 16' : '4 / 5';

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
  );
};

export default PreviewCard;

