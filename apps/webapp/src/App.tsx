import React, { useEffect, useMemo, useState } from "react";
import { splitIntoSlides as splitIntoLines } from "./core/text-split";
import { splitIntoSlides as splitText } from "./core/text";
import { renderSlide } from "./core/render";
import { shareOrDownloadAll } from "./core/export";
import BottomBar from "./components/BottomBar";
import BottomSheet from "./components/BottomSheet";
import ImagesModal from "./components/ImagesModal";
import "./styles/tailwind.css";

type SlideCount = "auto" | 1|2|3|4|5|6|7|8|9|10;
type Theme = "light" | "dark" | "photo";
type Img = {id:string; url:string};

export default function App() {
  const [text, setText] = useState("");
  const [count, setCount] = useState<SlideCount>("auto");
  const [username, setUsername] = useState("@username");
  const [fontReady, setFontReady] = useState(false);
  const [theme, setTheme] = useState<Theme>("photo");
  const [accent, setAccent] = useState("#5B4BFF");
  const [fontSize, setFontSize] = useState(42);
  const [lineHeight, setLineHeight] = useState(1.32);
  const [isExporting, setIsExporting] = useState(false);
  const [images, setImages] = useState<Img[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLayout, setOpenLayout] = useState(false);
  const [openImages, setOpenImages] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [textPosition, setTextPosition] = useState<'top'|'bottom'>('bottom');
  const [matchHeaderBody, setMatchHeaderBody] = useState(true);

  useEffect(() => {
    const f = new FontFace("Inter", "url(https://fonts.gstatic.com/s/inter/v13/UcCO3Fwr0gYb.woff2)");
    f.load().then(ff => { (document as any).fonts.add(ff); setFontReady(true); }).catch(()=>setFontReady(true));
  }, []);

  useEffect(() => {
    if (localStorage.getItem("carousel__seeded")) return;
    setText(
`Выгорание убивает планы.
Но именно в моменты усталости мы закаляем характер.

Не жди мотивацию — создавай систему.
Маленькие шаги каждый день сильнее вдохновения раз в месяц.

Когда нет сил — сделай одно действие.
Сохрани темп, а не максимум. Стабильность рождает результат.

Планируй накануне, действуй утром без раздумий.
Сегодняшняя дисциплина — завтрашняя свобода.`
    );
    setCount(4 as any);
    localStorage.setItem("carousel__seeded", "1");
  }, []);

  const slides = useMemo(() => {
    if (!fontReady) return [];
    const maxN = count === "auto" ? 10 : (count as number);
    const parts = splitText(text, { maxCharsPerSlide: 280 }).slice(0, maxN);
    return parts.map(part => (
      splitIntoLines({
        text: part, maxSlides: 1, fontFamily: "Inter",
        fontSize, minFontSize: Math.max(12, fontSize-8), lineHeight,
        padding: 96, width:1080, height:1350
      })[0] ?? { lines:[], fontFamily:"Inter", fontSize, lineHeight, padding:96 }
    ));
  }, [text, count, fontReady, fontSize, lineHeight]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const urls: string[] = [];
      for (let i=0; i<slides.length; i++){
        const bg = images[i]?.url || images[images.length-1]?.url || "";
        const blob = await renderSlide({
          lines: slides[i].lines,
          fontFamily: slides[i].fontFamily, fontSize: slides[i].fontSize,
          lineHeight: slides[i].lineHeight, padding: slides[i].padding,
          width:1080, height:1350, pageIndex:i+1, total:slides.length,
          username, backgroundDataURL: bg, theme, accent,
          textPosition, matchHeaderBody,
        });
        urls.push(URL.createObjectURL(blob));
      }
      if (!cancel) setPreviews(urls);
    })();
    return () => {
      cancel = true;
      setPreviews(prev => { prev.forEach(u=>URL.revokeObjectURL(u)); return []; });
    };
  }, [slides, images, username, theme, accent, textPosition, matchHeaderBody]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blobs: Blob[] = [];
      for (let i=0; i<slides.length; i++){
        const bg = images[i]?.url || images[images.length-1]?.url || "";
        const blob = await renderSlide({
          lines: slides[i].lines,
          fontFamily: slides[i].fontFamily, fontSize: slides[i].fontSize,
          lineHeight: slides[i].lineHeight, padding: slides[i].padding,
          width:1080, height:1350, pageIndex:i+1, total:slides.length,
          username, backgroundDataURL: bg, theme, accent,
          textPosition, matchHeaderBody,
        });
        blobs.push(blob);
      }
      await shareOrDownloadAll(blobs);
    } finally {
      setTimeout(()=>setIsExporting(false), 600);
    }
  };

  return (
    <div className="min-h-full pt-[calc(12px+env(safe-area-inset-top))] px-4 sm:px-6 bg-neutral-950 text-neutral-100">
      <div className="pb-[108px] pb-[calc(108px+env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
            <label className="block text-sm text-neutral-400 mb-2">Text</label>
            <textarea
              placeholder="Вставь текст сюда…"
              className="w-full h-40 p-4 rounded-xl bg-neutral-950 border border-neutral-800 outline-none placeholder:text-neutral-500"
              value={text} onChange={e=>setText(e.target.value)}
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

        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-4 lg:p-6">
            <div className="text-neutral-400 text-sm mb-3">Preview</div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
              {previews.map((url,i)=>(
                <div key={i} className="snap-start shrink-0 w-[260px] aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-800 relative">
                  <img src={url} className="w-full h-full object-cover" />
                  <div className="absolute left-3 bottom-3 z-10 text-white/90 text-xs">@{username.replace(/^@/, "")}</div>
                  <div className="absolute right-3 bottom-3 text-white/70 text-xs select-none">{i+1}/{previews.length} →</div>
                </div>
              ))}
              {!previews.length && <div className="text-neutral-500">Вставь текст ↑</div>}
            </div>
          </div>
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
            Header matches body
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

      <ImagesModal open={openImages} onClose={()=>setOpenImages(false)} images={images} setImages={setImages} />

      <BottomSheet open={openInfo} onClose={()=>setOpenInfo(false)} title="Info">
        <div>Coming soon…</div>
      </BottomSheet>
      </div>

      <BottomBar
        onTemplate={()=>setOpenTemplate(true)}
        onColor={()=>setOpenColor(true)}
        onLayout={()=>setOpenLayout(true)}
        onPhotos={()=>setOpenImages(true)}
        onInfo={()=>setOpenInfo(true)}
        onExport={handleExport}
        disabledExport={!slides.length || isExporting}
        active={openTemplate?"template":openColor?"color":openLayout?"layout":openImages?"photos":openInfo?"info":undefined}
      />
    </div>
  );
}
