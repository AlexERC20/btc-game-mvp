import React, { useState } from 'react';
import BottomSheet from '../../components/BottomSheet';
import { exportSlides, ExportOptions } from '../../core/export';
import { useStore } from '../../state/store';

export function ExportSheet() {
  const slides = useStore(s => s.slides);
  const frame = useStore(s => s.frame);
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [quality, setQuality] = useState(0.8);
  const [range, setRange] = useState<'all' | 'current'>('all');
  const [progress, setProgress] = useState('');
  const [fallback, setFallback] = useState<string | null>(null);

  const handleExport = async () => {
    if (!slides.length) return;
    setProgress('Rendering 0/0...');
    const opts: ExportOptions = {
      format,
      quality,
      range,
      size: { width: frame.width, height: frame.height },
      onProgress: (i, total) => setProgress(`Rendering ${i}/${total}...`),
      onFallback: (url) => setFallback(url),
    };
    try {
      await exportSlides(slides, opts, 0);
      setProgress('');
    } catch (e) {
      console.error(e);
      setProgress('');
      alert('Export failed');
    }
  };

  return (
    <BottomSheet name="export" title="Export">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="format"
              value="jpg"
              checked={format === 'jpg'}
              onChange={() => setFormat('jpg')}
            />
            <span>JPG</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="format"
              value="png"
              checked={format === 'png'}
              onChange={() => setFormat('png')}
            />
            <span>PNG</span>
          </label>
        </div>
        {format === 'jpg' && (
          <div className="flex items-center gap-2">
            <span>Quality</span>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={quality}
              onChange={e => setQuality(parseFloat(e.target.value))}
            />
            <span>{quality.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="range"
              value="all"
              checked={range === 'all'}
              onChange={() => setRange('all')}
            />
            <span>All slides</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="range"
              value="current"
              checked={range === 'current'}
              onChange={() => setRange('current')}
            />
            <span>Current</span>
          </label>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={!slides.length}
        >
          Export
        </button>
        {progress && (
          <p className="mt-4 text-center text-sm opacity-80">{progress}</p>
        )}
        {fallback && (
          <div className="mt-4 text-center">
            <p className="mb-2 text-sm opacity-80">Нажми и удерживай, чтобы сохранить</p>
            <img src={fallback} alt="" className="mx-auto max-w-full" />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

