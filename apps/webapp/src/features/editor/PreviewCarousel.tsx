import React, { useState, useRef, useCallback, useEffect } from 'react';

type Slide = {
  id: string;
  image?: string;
  thumb?: string;
};

export function PreviewCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSheet, setActiveSheet] = useState<'template' | 'layout' | 'fonts' | 'photos' | 'info' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mode] = useState<'story' | 'carousel'>('carousel');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function drawOverlayGradient(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    enabled: boolean,
    heightPct = 40,
    intensity = 2
  ) {
    if (!enabled) return;
    const overlayH = Math.round(h * (heightPct / 100));
    const g = ctx.createLinearGradient(0, h - overlayH, 0, h);
    const a = Math.min(0.18 * intensity, 0.6);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, h - overlayH, w, overlayH);
  }

  async function drawImageFit(ctx: CanvasRenderingContext2D, src: string, w: number, h: number) {
    const img = new Image();
    img.src = src;
    await new Promise((res) => {
      img.onload = res;
      img.onerror = res;
    });
    const r = Math.max(w / img.width, h / img.height);
    const nw = img.width * r;
    const nh = img.height * r;
    const dx = (w - nw) / 2;
    const dy = (h - nh) / 2;
    ctx.drawImage(img, dx, dy, nw, nh);
  }

  function drawSlideText(
    ctx: CanvasRenderingContext2D,
    text: string | undefined,
    opts: {
      font: string;
      size: number;
      lineHeight: number;
      align: CanvasTextAlign;
      color: string;
      titleColor: string;
      titleEnabled: boolean;
    }
  ) {
    if (!text) return;
    ctx.fillStyle = opts.color;
    ctx.textAlign = opts.align;
    ctx.font = `${opts.size}px ${opts.font}`;
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, ctx.canvas.width / 2, 100 + i * opts.size * opts.lineHeight);
    });
  }

  function drawUsernameAndPager(ctx: CanvasRenderingContext2D, username: string, index: number, total: number) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(username, 12, 24);
    ctx.textAlign = 'right';
    ctx.fillText(`${index + 1}/${total}`, ctx.canvas.width - 12, 24);
  }

  async function saveBlobs(blobs: Blob[]) {
    blobs.forEach((blob, i) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-${i + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const renderSlideToCanvas = useCallback(
    async (slide: Slide & { index: number }, opts: { w: number; h: number }) => {
      const canvas = document.createElement('canvas');
      canvas.width = opts.w;
      canvas.height = opts.h;
      const ctx = canvas.getContext('2d')!;
      if (slide.image) {
        await drawImageFit(ctx, slide.image, opts.w, opts.h);
      }
      drawOverlayGradient(ctx, opts.w, opts.h, overlayEnabled, overlayHeightPct, overlayIntensity);
      drawSlideText(ctx, '', { font, size, lineHeight, align, color, titleColor, titleEnabled });
      drawUsernameAndPager(ctx, username, slide.index, slides.length);
      return canvas;
    },
    [
      align,
      color,
      font,
      lineHeight,
      overlayEnabled,
      overlayHeightPct,
      overlayIntensity,
      slides.length,
      titleColor,
      titleEnabled,
      username,
      size,
    ]
  );

  const exportSlides = useCallback(async () => {
    const W = mode === 'story' ? 1080 : 1350;
    const H = mode === 'story' ? 1920 : 1080;
    const blobs: Blob[] = [];
    for (let i = 0; i < slides.length; i++) {
      const canvas = await renderSlideToCanvas({ ...slides[i], index: i }, { w: W, h: H });
      const blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), 'image/jpeg', 0.95)
      );
      blobs.push(blob);
    }
    await saveBlobs(blobs);
  }, [mode, renderSlideToCanvas, slides]);

  const onExport = useCallback(async () => {
    try {
      setIsExporting(true);
      await exportSlides();
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setIsExporting(false);
    }
  }, [exportSlides]);

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
    const onAddClick = () => inputRef.current?.click();
    const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      appendPhotos(files);
    };
    return (
      <div className="sheet">
        <div className="sheet__header">
          <div className="sheet__title">Photos</div>
          <div className="sheet__actions">
            <button onClick={onAddClick} className="btn btn--ghost">Add photo</button>
            <button onClick={closePhotosSheet} className="btn btn--primary">Done</button>
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
        <div className="grid">
          {slides.map((s, i) => (
            <div className="grid__item" key={s.id}>
              {s.thumb && <img src={s.thumb} alt="" />}
              <button className="grid__move grid__move--left" onClick={() => moveSlide(i, i - 1)}>
                ◀
              </button>
              <button className="grid__move grid__move--right" onClick={() => moveSlide(i, i + 1)}>
                ▶
              </button>
              <button className="grid__remove" onClick={() => removeSlide(i)}>
                ✕
              </button>
            </div>
          ))}
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
        const c = await renderSlideToCanvas({ ...slide, index }, { w: 300, h: 300 });
        const ctx = canvasRef.current.getContext('2d');
        ctx?.drawImage(c, 0, 0);
      })();
    }, [slide, index, renderSlideToCanvas]);

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
      className="page"
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
        <button className="toolbar__btn" onClick={() => setActiveSheet('template')} aria-label="Template">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </span>
          <span className="toolbar__label">Template</span>
        </button>
        <button className="toolbar__btn" onClick={() => setActiveSheet('layout')} aria-label="Layout">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" />
            </svg>
          </span>
          <span className="toolbar__label">Layout</span>
        </button>
        <button className="toolbar__btn" onClick={() => setActiveSheet('fonts')} aria-label="Fonts">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <text x="4" y="18" fontSize="16">F</text>
            </svg>
          </span>
          <span className="toolbar__label">Fonts</span>
        </button>
        <button className="toolbar__btn" onClick={() => setActiveSheet('photos')} aria-label="Photos">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <path d="M4 4h16v16H4z" />
            </svg>
          </span>
          <span className="toolbar__label">Photos</span>
        </button>
        <button className="toolbar__btn" onClick={() => setActiveSheet('info')} aria-label="Info">
          <span className="toolbar__icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </span>
          <span className="toolbar__label">Info</span>
        </button>
        <button
          className="toolbar__btn"
          onClick={onExport}
          disabled={isExporting || slides.length === 0}
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
      <style>{`
        .slidesScroll { overflow: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; }
        .toolbar { position: sticky; bottom: 0; left:0; right:0; display:flex; justify-content:space-between; padding:10px 12px; backdrop-filter:blur(10px); z-index:5; pointer-events:auto; background:rgba(28,28,28,.92); }
        .toolbar__btn { display:flex; flex-direction:column; align-items:center; gap:6px; min-width:54px; border:0; background:transparent; color:#fff; }
        .toolbar__icon { display:inline-flex; width:20px; height:20px; }
        .toolbar__label { font-size:12px; line-height:14px; opacity:.9; }
        .sheet { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; flex-direction:column; }
        .sheet__header { background:#fff; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; }
        .sheet__actions { display:flex; gap:12px; }
        .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(80px,1fr)); gap:8px; padding:8px; max-height:70vh; overflow:auto; -webkit-overflow-scrolling:touch; background:#fff; }
        .grid__item { position:relative; }
        .grid__item img { width:100%; height:80px; object-fit:cover; border-radius:4px; }
        .grid__move { position:absolute; top:4px; width:20px; height:20px; }
        .grid__move--left { left:4px; }
        .grid__move--right { right:4px; }
        .grid__remove { position:absolute; bottom:4px; right:4px; }
        .slide { position:relative; }
        .slide__menu { position:absolute; top:4px; right:4px; display:flex; flex-direction:column; }
      `}</style>
    </div>
  );
}
