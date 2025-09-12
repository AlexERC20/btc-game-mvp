import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

type BottomSheetProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('body--sheet-open');
    return () => document.body.classList.remove('body--sheet-open');
  }, [open]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 50) onClose();
  };
  const onTouchEnd = () => {
    startY.current = null;
  };

  return createPortal(
    <div className="sheet" onClick={onClose}>
      <div
        className="sheet__panel"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {title && <div className="sheet__title">{title}</div>}
        <div className="sheet__content">{children}</div>
      </div>
    </div>,
    document.body
  );
}

