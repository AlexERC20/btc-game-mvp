import React, { useRef } from 'react';
import { createPortal } from 'react-dom';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  insetBottom?: boolean;
  children: React.ReactNode;
};

export default function BottomSheet({
  open,
  onClose,
  title,
  insetBottom = false,
  children,
}: BottomSheetProps) {
  if (!open) return null;

  const startY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current !== null) {
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > 80) onClose();
      startY.current = null;
    }
  };

  return createPortal(
    <div className="sheet-wrap">
      <div className="sheet-backdrop" onClick={onClose} />
      <section
        className={`sheet ${insetBottom ? 'sheet--inset' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {title && (
          <div className="sheet__header">
            <h3>{title}</h3>
            <button className="sheet__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        )}
        <div className="sheet__body">{children}</div>
      </section>
    </div>,
    document.body
  );
}

