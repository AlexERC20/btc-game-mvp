import React, { useState, useRef, useEffect } from 'react';
import { renderSlideToCanvas, Slide } from '../carousel/lib/canvasRender';
import BottomBar from '../../components/BottomBar';
import LayoutSheet from '../../components/sheets/LayoutSheet';
import BottomSheet from '../../components/BottomSheet';
import { PhotosPicker } from './PhotosPicker';

export function PreviewCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  type Sheet = null | 'template' | 'layout' | 'fonts' | 'photos' | 'info';
  const [activeSheet, setActiveSheet] = useState<Sheet>(null);
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

  const appendPhotos = (urls: string[]) => {
    const next = urls.map((url) => ({
      id: Math.random().toString(36).slice(2),
      image: url,
      thumb: url,
    }));
    setSlides(prev => [...prev, ...next]);
  };

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
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
      }}
    >
      <div className="slidesScroll">
        {slides.map((s, i) => (
          <SlideCard key={s.id} slide={s} index={i} />
        ))}
      </div>
      <BottomBar activeSheet={activeSheet} setActiveSheet={setActiveSheet} />
      <TemplateSheet open={activeSheet === 'template'} onClose={() => setActiveSheet(null)} />
      <LayoutSheet open={activeSheet === 'layout'} onClose={() => setActiveSheet(null)} />
      <FontsSheet open={activeSheet === 'fonts'} onClose={() => setActiveSheet(null)} />
      <PhotosPicker open={activeSheet === 'photos'} onClose={() => setActiveSheet(null)} onPick={appendPhotos} />
      <InfoSheet open={activeSheet === 'info'} onClose={() => setActiveSheet(null)} />
      {/* export sheet handled globally */}
    </div>
  );
}

function TemplateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <BottomSheet open={open} onClose={onClose} title="Template" />;
}

function FontsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <BottomSheet open={open} onClose={onClose} title="Fonts" />;
}

function InfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <BottomSheet open={open} onClose={onClose} title="Info" />;
}
