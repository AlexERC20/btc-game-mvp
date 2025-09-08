import React, { useEffect, useState, useCallback } from "react";
import { renderSlideToCanvas } from "./core/render";
import { CANVAS_PRESETS } from "./core/constants";
import { shareOrDownloadAll } from "./core/export";
import { recomputeSlides } from "./core/slides";
import BottomBar from "./components/BottomBar";
import BottomSheet from "./components/BottomSheet";
import ImagesModal from "./components/ImagesModal";
import BuilderPreview from "./components/BuilderPreview";
import "./styles/tailwind.css";
import "./styles/builder-preview.css";
import { getWelcomeText, SEED_KEY } from "./core/seed";
import type { Slide, Theme, CanvasMode, PhotoMeta } from "./types";

type SlideCount = "auto" | 1|2|3|4|5|6|7|8|9|10;

export default function App() {
  const [rawText, setRawText] = useState("");
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [count, setCount] = useState<SlideCount>("auto");
  const [username, setUsername] = useState("@username");
  const [fontReady, setFontReady] = useState(false);
  const [theme, setTheme] = useState<Theme>("photo");
  const [accent, setAccent] = useState("#5B4BFF");
  const [fontSize, setFontSize] = useState(42);
  const [lineHeight, setLineHeight] = useState(1.32);
  const [mode, setMode] = useState<CanvasMode>('story');
  const [isExporting, setIsExporting] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLayout, setOpenLayout] = useState(false);
  const [openImages, setOpenImages] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [textPosition, setTextPosition] = useState<'top'|'bottom'>('bottom');
  const [matchHeaderBody, setMatchHeaderBody] = useState(true);

  const onTextChange = (value: string) => {
    setRawText(value);
  };

  const recompute = useCallback(() => {
    const computed = recomputeSlides({
      mode,
      template: theme,
      layout: { textPosition, textSize: fontSize, lineHeight },
      color: { accent },
      slidesText: rawText,
      photos,
      username,
    });
    const maxN = count === "auto" ? computed.length : Math.min(computed.length, count as number);
    setSlides(computed.slice(0, maxN));
  }, [mode, theme, textPosition, fontSize, lineHeight, accent, rawText, photos, username, count]);

  useEffect(() => {
    recompute();
  }, [mode, theme, textPosition, fontSize, lineHeight, accent, rawText, photos, username, count]);

  const onPhotosPicked = (urls: string[]) => {
    const next: PhotoMeta[] = urls.map((url, idx) => ({ id: `${Date.now()}_${idx}`, url }));
    setPhotos(prev => [...prev, ...next]);
  };

  useEffect(() => {
    const f = new FontFace("Inter", "url(https://fonts.gstatic.com/s/inter/v13/UcCO3Fwr0gYb.woff2)");
    f.load().then(ff => { (document as any).fonts.add(ff); setFontReady(true); }).catch(()=>setFontReady(true));
  }, []);

  useEffect(() => {
    if (localStorage.getItem(SEED_KEY)) return;

    const nothingTyped = !rawText || rawText.trim().length === 0;
    const noSlides = !slides || slides.length === 0;

    if (nothingTyped && noSlides) {
      const demo = getWelcomeText();
      onTextChange(demo);
      setCount(5 as any);
      localStorage.setItem(SEED_KEY, "1");
    }
  }, []);


  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const computed = recomputeSlides({
        mode,
        template: theme,
        layout: { textPosition, textSize: fontSize, lineHeight },
        color: { accent },
        slidesText: rawText,
        photos,
        username,
      });
      const maxN = count === "auto" ? computed.length : Math.min(computed.length, count as number);
      const slidesForExport = computed.slice(0, maxN);
      const blobs: Blob[] = [];
      const preset = CANVAS_PRESETS[mode];
      const cnv = document.createElement("canvas");
      cnv.width = preset.w; cnv.height = preset.h;
      const ctx = cnv.getContext("2d")!;
      const lastImage = slidesForExport.map(s=>s.image).filter(Boolean).pop();
      for (let i = 0; i < slidesForExport.length; i++) {
        const slide = { ...slidesForExport[i] } as Slide;
        if (!slide.image && lastImage) slide.image = lastImage;
        await renderSlideToCanvas(slide, ctx, {
          frame: {
            width: preset.w,
            height: preset.h,
            paddingX: 72,
            paddingTop: 72,
            paddingBottom: 72,
            safeNickname: 120,
            safePagination: 120,
          },
          theme,
          defaults: {
            fontSize,
            lineHeight,
            textPosition,
            bodyColor: '#fff',
            titleColor: '#fff',
            matchTitleToBody: true,
          },
          username: username.replace(/^@/, ''),
          page: { index: i + 1, total: slidesForExport.length, showArrow: i + 1 < slidesForExport.length },
        });
        const blob = await new Promise<Blob>(res => cnv.toBlob(b => res(b!), 'image/jpeg', 0.95)!);
        blobs.push(blob);
      }
      await shareOrDownloadAll(blobs);
    } finally {
      setTimeout(()=>setIsExporting(false), 600);
    }
  };

  const canExport = photos.length > 0;

  return (
    <div className="min-h-full pt-[calc(12px+env(safe-area-inset-top))] px-4 sm:px-6 bg-neutral-950 text-neutral-100">
      <div className="pb-[88px] pb-[calc(88px+env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
            <textarea
              placeholder="Вставь текст сюда…"
              className="w-full h-40 p-4 rounded-xl bg-neutral-950 border border-neutral-800 outline-none placeholder:text-neutral-500"
              value={rawText} onChange={e=>onTextChange(e.target.value)}
            />
            <div className="mt-3 flex items-center gap-3">
              <select
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm"
                value={String(count)}
                onChange={e=> setCount(e.target.value==="auto" ? "auto" : Number(e.target.value) as any)}
              >
                <option value="auto">Авто</option>
                {[...Array(10)].map((_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
              <input
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm w-full"
                value={username} onChange={e=>setUsername(e.target.value)} placeholder="@username"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 builder-preview">
          {slides.length ? (
            <BuilderPreview
              slides={slides.map(s => ({ id: s.id, text: s.body, image: s.image }))}
              mode={mode}
              textPosition={textPosition}
              username={username}
            />
          ) : (
            <div className="text-neutral-500">Вставь текст ↑</div>
          )}
        </div>
      </div>

      <BottomSheet open={openTemplate} onClose={()=>setOpenTemplate(false)} title="Template">
        <div className="grid grid-cols-3 gap-3">
          <button className="rounded-xl border border-neutral-700 p-3 hover:bg-neutral-800" onClick={()=>{ setTheme("photo"); setOpenTemplate(false); }}>Photo</button>
          <button className="rounded-xl border border-neutral-700 p-3 hover:bg-neutral-800" onClick={()=>{ setTheme("light"); setOpenTemplate(false); }}>Light</button>
          <button className="rounded-xl border border-neutral-700 p-3 hover:bg-neutral-800" onClick={()=>{ setTheme("dark"); setOpenTemplate(false); }}>Dark</button>
        </div>
      </BottomSheet>

      <BottomSheet open={openColor} onClose={()=>setOpenColor(false)} title="Color">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            {["#7C4DFF","#2563EB","#10B981","#F59E0B","#EF4444"].map(c=>(
              <button key={c} onClick={()=>{ setAccent(c); setOpenColor(false); }}
                      className="w-8 h-8 rounded-full border-2 border-white/20" style={{background:c}}/>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={matchHeaderBody} onChange={e=>setMatchHeaderBody(e.target.checked)} />
            Заголовок как текст
          </label>
        </div>
      </BottomSheet>

      <BottomSheet open={openLayout} onClose={()=>setOpenLayout(false)} title="Layout">
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span>Text size</span>
            <input type="range" min={34} max={60} value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}/>
          </label>
          <label className="flex items-center justify-between">
            <span>Line height</span>
            <input type="range" min={1.1} max={1.6} step={0.05} value={lineHeight} onChange={e=>setLineHeight(Number(e.target.value))}/>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={textPosition==='bottom'} onChange={()=>setTextPosition('bottom')} />
            Text at bottom
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={textPosition==='top'} onChange={()=>setTextPosition('top')} />
            Text at top
          </label>
        </div>
      </BottomSheet>

      <ImagesModal
        open={openImages}
        onClose={()=>setOpenImages(false)}
        onConfirm={(urls:string[])=>{ onPhotosPicked(urls); setOpenImages(false); }}
      />

      <BottomSheet open={openInfo} onClose={()=>setOpenInfo(false)} title="Info">
        <div className="space-y-4">
          <button
            className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-sm"
            onClick={() => {
              const demo = getWelcomeText();
              localStorage.removeItem(SEED_KEY);
              onTextChange(demo);
              setCount(5 as any);
            }}
          >
            Загрузить пример (5 слайдов)
          </button>
        </div>
      </BottomSheet>
      </div>

      <BottomBar
        onTemplate={()=>setOpenTemplate(true)}
        onColor={()=>setOpenColor(true)}
        onLayout={()=>setOpenLayout(true)}
        onMode={()=>setMode(mode==='story'?'carousel':'story')}
        onPhotos={()=>setOpenImages(true)}
        onInfo={()=>setOpenInfo(true)}
        onExport={handleExport}
        disabledExport={!slides.length || isExporting || !canExport}
        active={openTemplate?"template":openColor?"color":openLayout?"layout":openImages?"photos":openInfo?"info":undefined}
        mode={mode}
      />
    </div>
  );
}
