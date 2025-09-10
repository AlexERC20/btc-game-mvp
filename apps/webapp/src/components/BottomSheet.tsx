import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../state/store';

type SheetName = ReturnType<typeof useStore>['openSheet'];

export default function BottomSheet({
  name,
  title,
  children,
}: {
  name: Exclude<SheetName, null>;
  title: string;
  children: React.ReactNode;
}) {
  const openSheet = useStore(s => s.openSheet);
  const setOpenSheet = useStore(s => s.setOpenSheet);
  const startY = useRef<number | null>(null);
  const isOpen = openSheet === name;

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const onClose = () => setOpenSheet(null);

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

  const portal = document.getElementById('portal-root');
  if (!portal) return null;

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="sheet__handle" />
        <div className="sheet__content">{children}</div>
      </div>
    </>,
    portal
  );
}
