import React, { useState, useRef, useEffect } from 'react';
import { renderSlideToCanvas, Slide } from '../carousel/lib/canvasRender';

export function PreviewCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSheet, setActiveSheet] = useState<'template' | 'layout' | 'fonts' | 'photos' | 'info' | 'export' | null>(null);
  const [mode] = useState<'story' | 'carousel'>('carousel');

  const username = 'user';
  const overlayEnabled = true;
  const overlayHeightPct = 40;
  const overlayIntensity = 2;
  const font = 'sans-serif';
  const size = 32;
  const lineHeight = 1.2;
  const align: CanvasTextAlign = 'center';
  const color = '#fff';
  const titleColor = '#fff';
  const titleEnabled = true;

  const exportSettings = {
    mode,
    overlay: { enabled: overlayEnabled, heightPct: overlayHeightPct, intensity: overlayIntensity },
    text: { font, size, lineHeight, align, color, titleColor, titleEnabled, content: '' },
    username,
  };

  const appendPhotos = (files: File[]) => {
    const next = files.map((file) => {
      const url = URL.createObjectURL(file);
      return { id: Math.random().toString(36).slice(2), image: url, thumb: url };
    });
    setSlides((prev) => [...prev, ...next]);
  };

  const closePhotosSheet = () => setActiveSheet(null);

  const moveSlide = (from: number, to: number) => {
    setSlides((prev) => {
      const arr = [...prev];
      if (to < 0 || to >= arr.length) return arr;
      const [sp] = arr.splice(from, 1);
      arr.splice(to, 0, sp);
      return arr;
    });
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const PhotosSheet: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const startY = useRef<number | null>(null);
    const onAddPhotos = () => inputRef.current?.click();
    const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      appendPhotos(files);
    };
    const onTouchStart = (e: React.TouchEvent) => {
      startY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
      if (startY.current !== null) {
        const dy = e.changedTouches[0].clientY - startY.current;
        if (dy > 50) closePhotosSheet();
        startY.current = null;
      }
    };
    return (
      <div className="sheet" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="sheet__inner">
          <div className="sheet__header">
            <h3>Photos</h3>
            <div className="sheet__actions">
              <button onClick={onAddPhotos}>Add photo</button>
              <button onClick={closePhotosSheet} className="is-primary">Done</button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={onFilesChange}
          />
          <div className="sheet__body">
            <div className="grid">
              {slides.map((s, i) => (
                <div className="grid__item" key={s.id}>
                  {s.thumb && <img src={s.thumb} alt="" />}
                  <button className="grid__remove" onClick={() => removeSlide(i)}>
                    ✕
                  </button>
                  <button className="grid__move grid__move--left" onClick={() => moveSlide(i, i - 1)}>
                    ‹
                  </button>
                  <button className="grid__move grid__move--right" onClick={() => moveSlide(i, i + 1)}>
                    ›
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SlideCard: React.FC<{ slide: Slide; index: number }> = ({ slide, index }) => {
    const [open, setOpen] = useState(false);
    const startX = useRef<number | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      (async () => {
        if (!canvasRef.current) return;
        const c = await renderSlideToCanvas({ ...slide, index }, {
          w: 300,
          h: 300,
          overlay: { enabled: overlayEnabled, heightPct: overlayHeightPct, intensity: overlayIntensity },
          text: { font, size, lineHeight, align, color, titleColor, titleEnabled, content: '' },
          username,
          total: slides.length,
        });
        const ctx = canvasRef.current.getContext('2d');
        ctx?.drawImage(c, 0, 0);
      })();
    }, [
      slide,
      index,
      overlayEnabled,
      overlayHeightPct,
      overlayIntensity,
      font,
      size,
      lineHeight,
      align,
      color,
      titleColor,
      titleEnabled,
      username,
      slides.length,
    ]);

    const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      startX.current = e.touches[0].clientX;
    };
    const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
      if (startX.current === null) return;
      const dx = e.touches[0].clientX - startX.current;
      const width = ref.current?.offsetWidth || 0;
      if (dx < -width * 0.15) setOpen(true);
      if (dx > width * 0.15) setOpen(false);
    };
    const onTouchEnd = () => {
      startX.current = null;
    };

    useEffect(() => {
      if (!open) return;
      const handler = (e: TouchEvent) => {
        if (!ref.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('touchstart', handler);
      return () => document.removeEventListener('touchstart', handler);
    }, [open]);

    return (
      <div
        className="slide"
        ref={ref}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} width={300} height={300} />
        {open && (
          <div className="slide__menu">
            <button>⋮</button>
            <button onClick={() => moveSlide(index, index - 1)}>↑</button>
            <button onClick={() => moveSlide(index, index + 1)}>↓</button>
            <button onClick={() => removeSlide(index)}>🗑</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="carousel-page"
      style={{
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        touchAction: 'pan-y',
      }}
    >
      <div className="slidesScroll">
        {slides.map((s, i) => (
          <SlideCard key={s.id} slide={s} index={i} />
        ))}
      </div>
      <div className="toolbar">
        <button className="toolbar__item" onClick={() => setActiveSheet('template')} aria-label="Template">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </span>
          <span className="toolbar__label">Template</span>
        </button>
        <button className="toolbar__item" onClick={() => setActiveSheet('layout')} aria-label="Layout">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" />
            </svg>
          </span>
          <span className="toolbar__label">Layout</span>
        </button>
        <button className="toolbar__item" onClick={() => setActiveSheet('fonts')} aria-label="Fonts">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <text x="4" y="18" fontSize="16">F</text>
            </svg>
          </span>
          <span className="toolbar__label">Fonts</span>
        </button>
        <button className="toolbar__item" onClick={() => setActiveSheet('photos')} aria-label="Photos">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <path d="M4 4h16v16H4z" />
            </svg>
          </span>
          <span className="toolbar__label">Photos</span>
        </button>
        <button className="toolbar__item" onClick={() => setActiveSheet('info')} aria-label="Info">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </span>
          <span className="toolbar__label">Info</span>
        </button>
        <button
          className="toolbar__item"
          onClick={() => setActiveSheet('export')}
          aria-label="Export"
        >
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </span>
          <span className="toolbar__label">Export</span>
        </button>
      </div>
      {activeSheet === 'photos' && <PhotosSheet />}
      {/* export sheet handled globally */}
      <style>{`
        .carousel-page{ overflow-y:auto; -webkit-overflow-scrolling:touch; }
        .slidesScroll { overflow: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; }
        .toolbar{ position: sticky; bottom: 0; z-index:30; display:grid; grid-template-columns:repeat(auto-fit,minmax(72px,1fr)); gap:12px; padding:12px 16px; background:rgba(22,22,24,.9); backdrop-filter:saturate(180%) blur(12px); border-radius:16px 16px 0 0; pointer-events:auto; }
        .toolbar__item{ display:flex; flex-direction:column; align-items:center; gap:6px; padding:8px 4px; border-radius:12px; border:0; background:transparent; color:#fff; }
        .toolbar__icon{ width:22px; height:22px; display:inline-flex; }
        .toolbar__label{ font-size:12px; line-height:14px; color:#e7e7ea; }
        @media (max-width:380px){ .toolbar{ grid-template-columns:repeat(4,1fr); } }
        .sheet{ position:fixed; inset:0; z-index:40; background:rgba(0,0,0,0.4); display:flex; justify-content:center; align-items:flex-end; }
        .sheet[aria-hidden="true"]{ pointer-events:none; }
        .sheet__inner{ width:100%; max-height:70vh; background:#fff; border-radius:16px 16px 0 0; display:flex; flex-direction:column; overflow:hidden; }
        .sheet__header{ padding:8px 12px; display:flex; justify-content:space-between; align-items:center; }
        .sheet__actions{ display:flex; gap:12px; }
        .sheet__body{ overflow:auto; -webkit-overflow-scrolling:touch; }
        .grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:8px; }
        .grid__item{ position:relative; width:100%; aspect-ratio:1/1; }
        .grid__item img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; border-radius:4px; }
        .grid__move{ position:absolute; bottom:4px; width:20px; height:20px; }
        .grid__move--left{ left:4px; }
        .grid__move--right{ right:4px; }
        .grid__remove{ position:absolute; top:4px; right:4px; }
        .slide { position:relative; }
        .slide__menu { position:absolute; top:4px; right:4px; display:flex; flex-direction:column; }
      `}</style>
    </div>
  );
}
