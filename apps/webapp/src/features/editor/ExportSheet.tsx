import React, { useState } from 'react';
import BottomSheet from '../../components/BottomSheet';
import { exportSlides } from '../carousel/utils/exportSlides';
import { useStore } from '../../state/store';

export function ExportSheet() {
  const slides = useStore(s => s.slides);
  const [progress, setProgress] = useState<string>('');

  const runExport = async (mode: 'all' | 'current') => {
    setProgress('Export 0/0');
    const indices = mode === 'current' ? [0] : undefined; // placeholder index
    await exportSlides({
      containerSelector: '#preview-list',
      hideSelectors: ['.toolbar', '.drag-ghost', '.sheet-backdrop'],
      format: 'jpeg',
      quality: 0.92,
      indices,
      onProgress: (i, total) => setProgress(`Export ${i}/${total}...`),
    });
    setProgress('');
  };

  return (
    <BottomSheet name="export" title="Export">
      <div className="flex flex-col gap-4">
        <button className="btn btn-primary" onClick={() => runExport('all')} disabled={!slides.length}>
          Save all (ZIP)
        </button>
        <button className="btn btn-secondary" onClick={() => runExport('current')} disabled={!slides.length}>
          Save current
        </button>
        {progress && <p className="mt-4 text-center text-sm opacity-80">{progress}</p>}
      </div>
    </BottomSheet>
  );
}
