import React, { useState, useRef } from 'react';
import { Slide } from '../carousel/lib/canvasRender';
import { exportSlides } from '../carousel/utils/exportSlides';

interface Props {
  slides: Slide[];
  settings: {
    mode: 'story' | 'carousel';
    overlay: { enabled: boolean; heightPct: number; intensity: number };
    text: {
      font: string;
      size: number;
      lineHeight: number;
      align: CanvasTextAlign;
      color: string;
      titleColor: string;
      titleEnabled: boolean;
    };
    username: string;
    quality?: number;
  };
  onClose: () => void;
}

export function ExportSheet({ slides, settings, onClose }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const startY = useRef<number | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportSlides(slides, settings);
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
