import React, { useState, useRef, useCallback } from 'react';

type Slide = {
  id: string;
  src?: string;
};

export function PreviewCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSheet, setActiveSheet] = useState<'template' | 'layout' | 'fonts' | 'photos' | 'info' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const exportSlides = useCallback(async () => {
    for (const s of slides) {
      if (!s.src) continue;
      const img = new Image();
      img.src = s.src;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res));
      if (blob) {
        const url = URL.createObjectURL(blob);
        URL.revokeObjectURL(url);
      }
    }
  }, [slides]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportSlides();
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setIsExporting(false);
    }
  };

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const next = files.map((file) => ({
      id: Math.random().toString(36).slice(2),
      src: URL.createObjectURL(file),
    }));
    setSlides((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > Math.abs(dy) + 4) {
      e.preventDefault();
    }
  };

  return (
    <div>
      <div className="slidesScroll" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
        {slides.map((s, i) => (
          <div key={s.id} className="slide">
            {s.src && <img src={s.src} alt={`Slide ${i + 1}`} />}
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="toolbar__grid">
          <button
            className="toolbar__item"
            onClick={() => setActiveSheet('template')}
            aria-label="Template"
          >
            <span className="toolbar__icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </span>
            <span className="toolbar__label">Template</span>
          </button>
          <button
            className="toolbar__item"
            onClick={() => setActiveSheet('layout')}
            aria-label="Layout"
          >
            <span className="toolbar__icon">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" />
              </svg>
            </span>
            <span className="toolbar__label">Layout</span>
          </button>
          <button
            className="toolbar__item"
            onClick={() => setActiveSheet('fonts')}
            aria-label="Fonts"
          >
            <span className="toolbar__icon">
              <svg viewBox="0 0 24 24">
                <text x="4" y="18" fontSize="16">
                  F
                </text>
              </svg>
            </span>
            <span className="toolbar__label">Fonts</span>
          </button>
          <button
            className="toolbar__item"
            onClick={() => setActiveSheet('photos')}
            aria-label="Photos"
          >
            <span className="toolbar__icon">
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z" />
              </svg>
            </span>
            <span className="toolbar__label">Photos</span>
          </button>
          <button
            className="toolbar__item"
            onClick={() => setActiveSheet('info')}
            aria-label="Info"
          >
            <span className="toolbar__icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </span>
            <span className="toolbar__label">Info</span>
          </button>
          <button className="toolbar__item" onClick={handleExport} aria-label="Export">
            <span className="toolbar__icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </span>
            <span className="toolbar__label">{isExporting ? 'Exporting' : 'Export'}</span>
          </button>
        </div>
      </div>

      {activeSheet === 'photos' && (
        <div className="photosSheet">
          <div className="photosSheet__header">
            <button onClick={() => fileInputRef.current?.click()}>Add photo</button>
            <button onClick={() => setActiveSheet(null)}>Done</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={onFilesSelected}
            />
          </div>
          <div className="photosSheet__body">
            <div className="photosSheet__grid">
              {slides.map((s, i) => (
                <img key={s.id} src={s.src} alt={`thumb ${i + 1}`} className="photosSheet__thumb" />
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .slidesScroll {
          overflow: auto;
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
        }
        .toolbar { position: sticky; bottom: 0; z-index: 20; padding: 10px 12px; background: rgba(28,28,28,.92); backdrop-filter: blur(12px); border-top-left-radius: 16px; border-top-right-radius: 16px; }
        .toolbar__grid { display: flex; justify-content: space-between; gap: 8px; }
        .toolbar__item { flex: 1 1 0; min-width: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px 6px; border: 0; background: transparent; color: #fff; }
        .toolbar__item:active { transform: scale(.98); }
        .toolbar__item[aria-pressed="true"] { background: rgba(255,255,255,.06); }
        .toolbar__icon { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
        .toolbar__icon svg { width: 22px; height: 22px; display: block; }
        .toolbar__label { font-size: 12px; line-height: 14px; opacity: .9; white-space: nowrap; }
        .photosSheet { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; }
        .photosSheet__header { background: #fff; padding: 8px 12px; display: flex; justify-content: space-between; }
        .photosSheet__body { max-height: 72vh; overflow: auto; -webkit-overflow-scrolling: touch; background: #fff; }
        .photosSheet__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px,1fr)); gap: 8px; padding: 8px; }
        .photosSheet__thumb { width: 100%; height: 80px; object-fit: cover; border-radius: 4px; }
      `}</style>
    </div>
  );
}

