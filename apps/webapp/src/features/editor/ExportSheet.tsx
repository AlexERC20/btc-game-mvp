import React, { useState, useRef } from 'react';
import { exportSlides } from '../carousel/utils/exportSlides';

interface Props {
  onClose: () => void;
}

export function ExportSheet({ onClose }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const startY = useRef<number | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportSlides({
        containerSelector: '#preview-list',
        hideSelectors: ['.toolbar', '.drag-ghost', '.sheet-backdrop'],
        format: 'jpeg',
        quality: 0.92,
      });
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current !== null) {
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > 50) onClose();
      startY.current = null;
    }
  };

  return (
    <div className="sheet" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="sheet__inner">
        <div className="sheet__header">
          <h3>Export</h3>
          <div className="sheet__actions">
            <button onClick={onClose}>Cancel</button>
            <button onClick={handleExport} className="is-primary" disabled={isExporting}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
