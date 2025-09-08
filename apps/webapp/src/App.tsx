import React, { useEffect, useState, useCallback } from "react";
import { renderSlideToCanvas } from "./core/render";
import { CANVAS_PRESETS } from "./core/constants";
import { shareOrDownloadAll } from "./core/export";
import BottomSheet from "./components/BottomSheet";
import ImagesModal from "./components/ImagesModal";
import PreviewList from "./components/PreviewList";
import PreviewCard from "./components/PreviewCard";
import TemplateIcon from "./icons/TemplateIcon";
import PaletteIcon from "./icons/PaletteIcon";
import LayoutIcon from "./icons/LayoutIcon";
import FrameIcon from "./icons/FrameIcon";
import CameraIcon from "./icons/CameraIcon";
import InfoIcon from "./icons/InfoIcon";
import DownloadIcon from "./icons/DownloadIcon";
import "./styles/tailwind.css";
import "./styles/builder-preview.css";
import { getWelcomeText, SEED_KEY } from "./core/seed";
import type { Slide, Theme, CanvasMode, PhotoMeta } from "./types";

type SlideCount = "auto" | 1|2|3|4|5|6|7|8|9|10;

type CarouselSettings = {
  fontFamily: 'Inter'|'Manrope'|'SF Pro'|'Montserrat';
  fontWeight: number;
  fontItalic: boolean;
  fontApplyHeading: boolean;
  fontApplyBody: boolean;
  overlayEnabled: boolean;
  overlayHeightPct: number;
  overlayOpacityPct: number;
};

const FontIcon = ({className}:{className?:string}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M4 20h16"/>
    <path d="M9 20l3-9 3 9"/>
    <path d="M8 16h8"/>
  </svg>
);

function BottomBar({
  onTemplate, onColor, onLayout, onFonts, onMode, onPhotos, onInfo, onExport, disabledExport, active, mode
}:{
  onTemplate: ()=>void;
  onColor: ()=>void;
  onLayout: ()=>void;
  onFonts: ()=>void;
  onMode: ()=>void;
  onPhotos: ()=>void;
  onInfo: ()=>void;
  onExport: ()=>void;
  disabledExport?: boolean;
  active?: 'template'|'color'|'layout'|'fonts'|'photos'|'info';
  mode: CanvasMode;
}) {
  const Item = ({icon,label,onClick,disabled,active}:{icon:React.ReactNode,label:string,onClick?:()=>void,disabled?:boolean,active?:boolean}) => (
    <button onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center justify-center h-14 rounded-xl text-xs ${disabled?"opacity-40":""} ${active?"bg-neutral-800/60":"hover:bg-neutral-800/60"} active:scale-[0.98] transition`}>
      <div className="h-6 w-6 text-neutral-100">{icon}</div>
      <div className="text-neutral-200 mt-1">{label}</div>
    </button>
  );
  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl">
        <div className="m-3 rounded-2xl border border-neutral-800 bg-neutral-900/85 backdrop-blur px-3 py-2 grid grid-cols-8 gap-1">
          <Item icon={<TemplateIcon className="w-6 h-6"/>} label="Template" onClick={onTemplate} active={active==='template'}/>
          <Item icon={<PaletteIcon className="w-6 h-6"/>}  label="Color"    onClick={onColor} active={active==='color'}/>
          <Item icon={<LayoutIcon className="w-6 h-6"/>}   label="Layout"   onClick={onLayout} active={active==='layout'}/>
          <Item icon={<FontIcon className="w-6 h-6"/>}     label="Fonts"    onClick={onFonts} active={active==='fonts'}/>
          <Item icon={<FrameIcon className="w-6 h-6"/>}    label={mode==='story'?'Story':'Carousel'} onClick={onMode}/>
          <Item icon={<CameraIcon className="w-6 h-6"/>}   label="Photos"   onClick={onPhotos} active={active==='photos'}/>
          <Item icon={<InfoIcon className="w-6 h-6"/>}     label="Info"     onClick={onInfo} active={active==='info'}/>
          <Item icon={<DownloadIcon className="w-6 h-6"/>} label="Export"   onClick={onExport} disabled={disabledExport}/>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [rawText, setRawText] = useState("");
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [count, setCount] = useState<SlideCount>("auto");
  const [username, setUsername] = useState("@username");
  const [theme, setTheme] = useState<Theme>("photo");
  const [accent, setAccent] = useState("#5B4BFF");
  const [fontSize, setFontSize] = useState(42);
  const [lineHeight, setLineHeight] = useState(1.32);
  const [mode, setMode] = useState<CanvasMode>('story');
  const [isExporting, setIsExporting] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLayout, setOpenLayout] = useState(false);
  const [openFonts, setOpenFonts] = useState(false);
  const [openImages, setOpenImages] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [textPosition, setTextPosition] = useState<'top'|'bottom'>('bottom');
  const [matchHeaderBody, setMatchHeaderBody] = useState(true);

  const DEFAULT_SETTINGS: CarouselSettings = {
    fontFamily: 'Inter',
    fontWeight: 600,
    fontItalic: false,
    fontApplyHeading: true,
    fontApplyBody: true,
    overlayEnabled: true,
    overlayHeightPct: 30,
    overlayOpacityPct: 18,
  };
  const [settings, setSettings] = useState<CarouselSettings>(() => {
    try {
      const saved = localStorage.getItem('carouselSettings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  useEffect(() => {
    localStorage.setItem('carouselSettings', JSON.stringify(settings));
  }, [settings]);

  const onTextChange = (value: string) => {
    setRawText(value);
  };

  const recompute = useCallback(() => {
    const texts = splitTextIntoSlides(rawText, mode, { targetCount: photos.length });
    const max = Math.max(texts.length, photos.length);
    const lastImage = photos.map(p => p.url).filter(Boolean).pop();
    const computed: Slide[] = [];
    for (let i = 0; i < max; i++) {
      computed.push({ body: texts[i] || '', image: photos[i]?.url || lastImage });
    }
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
      const texts = splitTextIntoSlides(rawText, mode, { targetCount: photos.length });
      const max = Math.max(texts.length, photos.length);
      const lastPhoto = photos.map(p => p.url).filter(Boolean).pop();
      const computed: Slide[] = [];
      for (let i = 0; i < max; i++) {
        computed.push({ body: texts[i] || '', image: photos[i]?.url || lastPhoto });
      }
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
          settings,
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

  const baseFamily = '"SF Pro Display","Inter",system-ui,-apple-system,Segoe UI,Roboto,Arial';
  const fFamily = settings.fontFamily === 'SF Pro'
    ? '-apple-system, BlinkMacSystemFont, "SF Pro Text","SF Pro Display","Segoe UI",Roboto,Inter,"Helvetica Neue",Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji",sans-serif'
    : settings.fontFamily;
  const fontStyle = settings.fontItalic ? 'italic' : 'normal';
  const cardStyle = {
    '--font-family-body': settings.fontApplyBody ? fFamily : baseFamily,
    '--font-weight-body': settings.fontApplyBody ? settings.fontWeight : 400,
    '--font-style-body': settings.fontApplyBody ? fontStyle : 'normal',
    '--font-family-heading': settings.fontApplyHeading ? fFamily : baseFamily,
    '--font-weight-heading': settings.fontApplyHeading ? settings.fontWeight : 400,
    '--font-style-heading': settings.fontApplyHeading ? fontStyle : 'normal',
    '--overlay-height': `${settings.overlayHeightPct}%`,
    '--overlay-opacity': settings.overlayEnabled ? settings.overlayOpacityPct / 100 : 0,
  } as React.CSSProperties;

  return (
    <>
    <style>{`
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal italic;
  font-display: swap;
}
@font-face {
  font-family: 'Manrope';
  src: url('/fonts/Manrope-Variable.woff2') format('woff2-variations');
  font-weight: 200 800;
  font-style: normal italic;
  font-display: swap;
}
@font-face {
  font-family: 'Montserrat';
  src: url('/fonts/Montserrat-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal italic;
  font-display: swap;
}
.preview-card__text {
  font-family: var(--font-family-body);
  font-weight: var(--font-weight-body);
  font-style: var(--font-style-body);
}
.preview-card__username {
  font-family: var(--font-family-heading);
  font-weight: var(--font-weight-heading);
  font-style: var(--font-style-heading);
}
.preview-card::after {
  height: var(--overlay-height,38%);
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,var(--overlay-opacity,0.55)) 100%);
}
    `}</style>
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
            <PreviewList>
              {slides.map(s => (
                <div key={s.id} style={cardStyle}>
                  <PreviewCard
                    mode={mode}
                    image={s.image}
                    text={s.body}
                    username={username.replace(/^@/, '')}
                    textPosition={textPosition}
                  />
                </div>
              ))}
            </PreviewList>
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
          <div className="pt-2 space-y-2 border-t border-neutral-700 mt-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.overlayEnabled} onChange={e=>setSettings({...settings, overlayEnabled: e.target.checked})}/>
              Overlay
            </label>
            <label className="flex items-center justify-between">
              <span>Height</span>
              <input type="range" min={10} max={50} value={settings.overlayHeightPct} onChange={e=>setSettings({...settings, overlayHeightPct:Number(e.target.value)})}/>
            </label>
            <label className="flex items-center justify-between">
              <span>Intensity</span>
              <input type="range" min={0} max={40} value={settings.overlayOpacityPct} onChange={e=>setSettings({...settings, overlayOpacityPct:Number(e.target.value)})}/>
            </label>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={openFonts} onClose={()=>setOpenFonts(false)} title="Fonts">
        <div className="space-y-2">
          <label className="flex flex-col gap-1">
            <span>Font family</span>
            <select className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800" value={settings.fontFamily} onChange={e=>setSettings({...settings, fontFamily: e.target.value as any})}>
              <option value="Inter">Inter</option>
              <option value="Manrope">Manrope</option>
              <option value="SF Pro">SF Pro</option>
              <option value="Montserrat">Montserrat</option>
            </select>
          </label>
          <label className="flex items-center justify-between">
            <span>Weight</span>
            <input type="range" min={300} max={900} step={50} value={settings.fontWeight} onChange={e=>setSettings({...settings, fontWeight:Number(e.target.value)})}/>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.fontItalic} onChange={e=>setSettings({...settings, fontItalic:e.target.checked})}/>
            Italic
          </label>
          <div className="space-y-1">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.fontApplyHeading} onChange={e=>setSettings({...settings, fontApplyHeading:e.target.checked})}/>
              Heading
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.fontApplyBody} onChange={e=>setSettings({...settings, fontApplyBody:e.target.checked})}/>
              Body
            </label>
          </div>
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
        onFonts={()=>setOpenFonts(true)}
        onMode={()=>setMode(mode==='story'?'carousel':'story')}
        onPhotos={()=>setOpenImages(true)}
        onInfo={()=>setOpenInfo(true)}
        onExport={handleExport}
        disabledExport={!slides.length || isExporting || !canExport}
        active={openTemplate?"template":openColor?"color":openLayout?"layout":openFonts?"fonts":openImages?"photos":openInfo?"info":undefined}
        mode={mode}
      />
    </div>
    </>
  );
}

// === LOCAL TEXT SPLITTER (single-file) =========================
// Никаких импортов, никаких внешних файлов.

type SplitOptions = {
  targetCount?: number;   // желаемое кол-во слайдов
  maxChars?: number;      // лимит символов
  maxLines?: number;      // лимит строк
};

function normalizeText(s: string) {
  return s.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

function splitByMarkers(s: string): string[] {
  const parts: string[] = [];
  const re = /(?:^|\n)Слайд\s*\d+\s*:\s*/gi;
  const idxs: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) idxs.push(m.index + m[0].length);
  if (!idxs.length) return [s];
  for (let i = 0; i < idxs.length; i++) {
    const start = idxs[i];
    const end = i + 1 < idxs.length ? idxs[i + 1] : s.length;
    parts.push(s.slice(start, end).trim());
  }
  return parts.filter(Boolean);
}

function splitByBlankLines(s: string): string[] {
  return s.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
}

function splitByLimit(
  s: string,
  limits: { maxChars: number; maxLines: number }
): string[] {
  const words = s.split(/\s+/);
  const res: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = (cur ? cur + ' ' : '') + w;
    const tooManyChars = test.length > limits.maxChars;
    const tooManyLines = test.split('\n').length > limits.maxLines;
    if (tooManyChars || tooManyLines) {
      if (cur) res.push(cur.trim());
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur.trim()) res.push(cur.trim());
  return res.length ? res : [s.trim()];
}

function splitTextIntoSlides(
  input: string,
  mode: 'story' | 'carousel',
  opts: SplitOptions = {}
) {
  const text = normalizeText(input);

  const limits =
    mode === 'story'
      ? { maxChars: opts.maxChars ?? 360, maxLines: opts.maxLines ?? 6 }
      : { maxChars: opts.maxChars ?? 480, maxLines: opts.maxLines ?? 8 };

  // 1) Слайд-маркеры
  let parts = splitByMarkers(text);
  // 2) Пустые строки
  if (parts.length < 2) parts = splitByBlankLines(text);
  // 3) Жёсткий лимит
  if (parts.length < 2) parts = splitByLimit(text, limits);

  // Убираем "Слайд N:" из каждого куска
  parts = parts.map(p => p.replace(/^Слайд\s*\d+\s*:\s*/i, '').trim());

  const target = Math.max(1, opts.targetCount || parts.length);
  if (parts.length > target) parts = parts.slice(0, target);
  if (parts.length < target) parts = parts.concat(Array(target - parts.length).fill(''));

  return parts;
}
// === END LOCAL TEXT SPLITTER ==================================
