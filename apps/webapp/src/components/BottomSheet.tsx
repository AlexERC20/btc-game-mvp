import React, { useRef, useEffect } from 'react';
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
    if (isOpen) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
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

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="sheet__inner">
          <div className="sheet__header">
            <h3>{title}</h3>
            <button onClick={onClose}>Close</button>
          </div>
          <div className="sheet__body">{children}</div>
        </div>
      </div>
    </div>
  );
}
