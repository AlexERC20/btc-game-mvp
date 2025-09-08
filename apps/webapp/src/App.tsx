import React, { useEffect, useMemo, useRef, useState } from "react"
import { splitIntoSlides } from "./core/text-split"
import { renderSlide } from "./core/render"
import { shareOrDownloadAll } from "./core/export"
import { makeStory } from "./core/story"
import "./styles/tailwind.css"

type SlideCount = "auto" | 1|2|3|4|5|6|7|8|9|10
type Theme = "light" | "dark" | "photo"

export default function App() {
  const [text, setText] = useState("")
  const [count, setCount] = useState<SlideCount>("auto")
  const [username, setUsername] = useState("@username")
  const [photos, setPhotos] = useState<string[]>([])
  const [fontReady, setFontReady] = useState(false)
  const [theme, setTheme] = useState<Theme>("photo")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const f = new FontFace("Inter", "url(https://fonts.gstatic.com/s/inter/v13/UcCO3Fwr0gYb.woff2)")
    f.load().then(ff => { (document as any).fonts.add(ff); setFontReady(true) }).catch(()=>setFontReady(true))
  }, [])

  const fileInput = useRef<HTMLInputElement>(null)
  const onPickPhotos = () => fileInput.current?.click()
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const arr: string[] = []
    for (const f of files.slice(0,10)) {
      const buf = await f.arrayBuffer()
      const blob = new Blob([buf], {type: f.type})
      arr.push(await blobToDataURL(blob))
    }
    setPhotos(arr); e.target.value = ""
  }

  const slides = useMemo(() => {
    if (!fontReady) return []
    const maxN = count === "auto" ? 10 : (count as number)
    const story = makeStory(text, maxN)
    const packed = story.map(block => {
      const bodyText = (block.body ?? []).join(" ")
      const s = splitIntoSlides({
        text: bodyText, maxSlides: 1, fontFamily: "Inter",
        fontSize: 42, minFontSize: 34, lineHeight: 1.32,
        padding: 96, width:1080, height:1350
      })[0] ?? { lines:[], fontFamily:"Inter", fontSize:42, lineHeight:1.32, padding:96 }
      return { ...s, title: block.title, subtitle: block.subtitle }
    })
    return packed.slice(0, maxN)
  }, [text, count, fontReady])

  const onSaveAll = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const blobs: Blob[] = []
      for (let i=0; i<slides.length; i++){
        const bg = photos[i] || photos[photos.length-1] || ""
        const blob = await renderSlide({
          lines: slides[i].lines,
          title: slides[i].title, subtitle: slides[i].subtitle,
          fontFamily: slides[i].fontFamily, fontSize: slides[i].fontSize,
          lineHeight: slides[i].lineHeight, padding: slides[i].padding,
          width:1080, height:1350, pageIndex:i+1, total:slides.length,
          username, backgroundDataURL: bg, align:"bottom", theme
        })
        blobs.push(blob)
      }
      await shareOrDownloadAll(blobs)
    } finally {
      setTimeout(()=>setIsExporting(false), 600)
    }
  }

  return (
    <div className="min-h-full pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(12px+env(safe-area-inset-bottom))] px-4 sm:px-6 bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto flex items-center gap-3 mb-4">
        <button className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm">Back</button>
        <div className="text-neutral-300 text-sm">Get Images</div>
        <div className="ml-auto text-neutral-500 text-xs">09:41</div>
      </div>

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
              <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={onFiles}/>
              <button className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-900 font-medium text-sm" onClick={onPickPhotos}>
                Добавить фото
              </button>

              <select
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm"
                value={String(count)}
                onChange={e=> setCount(e.target.value==="auto" ? "auto" : Number(e.target.value) as any)}
              >
                <option value="auto">Авто</option>
                {[...Array(10)].map((_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <input
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm w-full"
                value={username} onChange={e=>setUsername(e.target.value)} placeholder="@username"
              />
              <button
                className={`px-4 py-2 rounded-xl ${isExporting?'opacity-50 pointer-events-none':''} bg-neutral-800 border border-neutral-700 text-sm`}
                onClick={onSaveAll} disabled={!slides.length || isExporting}
              >{isExporting ? "Saving…" : "Save all"}</button>

              <button
                className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm"
                onClick={()=>setTheme(t=> t==="photo"?"dark": t==="dark"?"light":"photo")}
                title="Template: photo → dark → light"
              >Template: {theme}</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-4 lg:p-6">
            <div className="text-neutral-400 text-sm mb-3">Preview</div>

            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
              {slides.map((s,i)=>(
                <div key={i} className="snap-start shrink-0 w-[260px] aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-800 relative p-4 text-[14px] leading-[1.35]">
                  <div className="absolute inset-0">
                    {photos[i] || photos[photos.length-1] ? (
                      <>
                        <img src={photos[i] || photos[photos.length-1]} className="w-full h-full object-cover opacity-70" />
                        <div className="absolute inset-0 bg-black/25" />
                      </>
                    ) : null}
                  </div>

                  <div className="absolute top-3 left-3 text-white/85 text-xs z-10">@{username.replace(/^@/,'')}</div>

                  <div className="relative z-10 h-full flex flex-col justify-end">
                    {s.title && <div className="inline-block bg-[#5B4BFF] text-white px-3 py-2 rounded-lg font-semibold mb-2 self-start">{s.title}</div>}
                    {s.subtitle && <div className="text-neutral-100/90 mb-2">{s.subtitle}</div>}
                    {s.lines.map((ln,k)=><div key={k} className="text-neutral-100">{ln}</div>)}
                    <div className="mt-2 text-neutral-300 text-xs">@{username.replace(/^@/,'')}</div>
                    <div className="absolute right-3 bottom-3 text-neutral-300 text-xs">{i+1}/{slides.length} →</div>
                  </div>
                </div>
              ))}
              {!slides.length && <div className="text-neutral-500">Вставь текст ↑</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

async function blobToDataURL(b: Blob){
  return new Promise<string>(res=>{ const r=new FileReader(); r.onload=()=>res(String(r.result)); r.readAsDataURL(b) })
}
