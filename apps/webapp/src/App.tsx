import React, { useEffect, useRef, useState } from 'react'
import { splitIntoSlides } from './core/text-split'
import { shareOrDownloadAll, downloadOne } from './core/export'
import { renderSlide } from './core/render'
import './styles/tailwind.css'

const Action = ({icon:Icon,label,onClick}:{icon:React.FC<React.SVGProps<SVGSVGElement>>,label:string,onClick:()=>void})=>(
  <button onClick={onClick} className="flex items-center gap-2">
    <span className="w-10 h-10 rounded-full border border-neutral-300 bg-white flex items-center justify-center shadow">
      <Icon width={18} height={18}/>
    </span>
    <span className="text-sm text-neutral-600">{label}</span>
  </button>
)

const PenIcon = (p:any)=>(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" d="M12 20h9"/><path strokeWidth="2" d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg>
)
const ArrowLrIcon = (p:any)=>(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" d="M7 7l-4 4 4 4"/><path strokeWidth="2" d="M17 7l4 4-4 4"/><path strokeWidth="2" d="M3 11h18M3 13h18"/></svg>
)
const TrashIcon = (p:any)=>(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" d="M3 6h18"/><path strokeWidth="2" d="M8 6V4h8v2"/><path strokeWidth="2" d="M19 6l-1 14H6L5 6"/></svg>
)

type SlideCount = 'auto' | 3 | 5 | 8 | 10
type Theme = 'light' | 'dark' | 'photo'

export default function App() {
  const [text, setText] = useState<string>('')
  const [count, setCount] = useState<SlideCount>('auto')
  const [username, setUsername] = useState<string>('@username')
  const [photos, setPhotos] = useState<string[]>([]) // dataURL массив
  const [fontReady, setFontReady] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  // грузим Inter как FontFace, чтобы метрики были точные
  useEffect(() => {
    const f = new FontFace('Inter', 'url(https://fonts.gstatic.com/s/inter/v13/UcCO3Fwr0gYb.woff2)')
    f.load().then(ff => {
      (document as any).fonts.add(ff)
      setFontReady(true)
    }).catch(()=>setFontReady(true))
  }, [])

  // считаем слайды при каждом изменении
  const [slides, setSlides] = useState<{lines:string[], fontSize:number, lineHeight:number, padding:number, fontFamily:string}[]>([])
  useEffect(() => {
    if (!fontReady) { setSlides([]); return }
    const hardMax = count === 'auto' ? 10 : count
    ;(async()=>{
      const res = await splitIntoSlides({
        text,
        maxSlides: hardMax,
        fontFamily: 'Inter',
        fontSize: 44,           // базовый кегль, будет уменьшаться при нехватке
        minFontSize: 36,
        lineHeight: 1.32,
        padding: 96,
        width: 1080,
        height: 1350
      })
      setSlides(res)
    })()
  }, [text, count, fontReady])

  const fileInput = useRef<HTMLInputElement>(null)
  const onPickPhotos = () => fileInput.current?.click()
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const arr: string[] = []
    for (const f of files.slice(0,10)) {
      const buf = await f.arrayBuffer()
      const blob = new Blob([buf], { type: f.type })
      arr.push(await blobToDataURL(blob))
    }
    setPhotos(arr)
    e.target.value = ''
  }

  const onSaveAll = async () => {
    const blobs: Blob[] = []
    for (let i=0; i<slides.length; i++) {
      const bg = photos[i] || photos[photos.length-1] || '' // повторяем последнее, если фоток меньше
      const blob = await renderSlide({
        lines: slides[i].lines,
        fontFamily: slides[i].fontFamily,
        fontSize: slides[i].fontSize,
        lineHeight: slides[i].lineHeight,
        padding: slides[i].padding,
        width: 1080, height: 1350,
        pageIndex: i+1, total: slides.length, username,
        backgroundDataURL: bg,
        theme
      })
      blobs.push(blob)
    }
    await shareOrDownloadAll(blobs)
  }

  const onShareOne = async () => {
    if (!slides.length) return
    const bg = photos[0] || photos[photos.length-1] || ''
    await downloadOne(await renderSlide({
      lines: slides[0].lines,
      fontFamily: slides[0].fontFamily,
      fontSize: slides[0].fontSize,
      lineHeight: slides[0].lineHeight,
      padding: slides[0].padding,
      width: 1080, height: 1350,
      pageIndex: 1, total: slides.length, username,
      backgroundDataURL: bg,
      theme
    }))
  }

  return (
    <div className="min-h-full pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(12px+env(safe-area-inset-bottom))] px-4 sm:px-6 bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto flex items-center gap-3 mb-4">
        <button className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm">Back</button>
        <div className="text-neutral-300 text-sm">Get Images</div>
        <div className="ml-auto text-neutral-500 text-xs">09:41</div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`
  rounded-2xl p-4 transition-colors
  ${theme==='dark' ? 'bg-neutral-900/70 border border-neutral-800 text-neutral-100' : 'bg-white border border-neutral-200 text-neutral-900'}
`}>
            <label className="block text-sm text-neutral-400 mb-2">Text</label>
            <textarea
              placeholder="Вставь текст сюда…"
              className={`
    w-full h-40 p-4 rounded-xl outline-none
    ${theme==='dark' ? 'bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-500' : 'bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400'}
  `}
              value={text}
              onChange={e=>setText(e.target.value)}
            />
            <div className="mt-3 flex items-center gap-3">
              <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={onFiles}/>
              <button className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-900 font-medium text-sm" onClick={onPickPhotos}>
                Добавить фото
              </button>
              <select
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm"
                value={String(count)}
                onChange={e => setCount(e.target.value === 'auto' ? 'auto' : Number(e.target.value) as SlideCount)}
              >
                <option value="auto">Авто</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="8">8</option>
                <option value="10">10</option>
              </select>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <input
                className={`
    px-3 py-2 rounded-xl text-sm w-full
    ${theme==='dark' ? 'bg-neutral-900 border border-neutral-800 text-neutral-100' : 'bg-white border border-neutral-300 text-neutral-900'}
  `}
                value={username}
                onChange={e=>setUsername(e.target.value)}
                placeholder="@username"
              />
              <button className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm" onClick={onSaveAll} disabled={!slides.length}>
                Save all
              </button>
              <button className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm" onClick={onShareOne} disabled={!slides.length}>
                Share
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/70 border border-neutral-200 p-3 flex flex-wrap gap-2 text-sm text-neutral-700">
            <button className={`px-4 py-2 rounded-xl border ${theme==='light'?'bg-white border-neutral-300 shadow':'bg-white/70 border-neutral-200'}`} onClick={()=>setTheme('light')}>Template: Light</button>
            <button className={`px-4 py-2 rounded-xl border ${theme==='dark'?'bg-neutral-900 text-white border-neutral-800':'bg-neutral-900/70 text-white/80 border-neutral-800'}`} onClick={()=>setTheme('dark')}>Dark</button>
            <button className={`px-4 py-2 rounded-xl border ${theme==='photo'?'bg-white border-neutral-300 shadow':'bg-white/70 border-neutral-200'}`} onClick={()=>setTheme('photo')}>Photo</button>
            <span className="ml-auto text-neutral-400">Info</span>
            <span className="text-neutral-400">Export</span>
          </div>
        </div>

        {/* RIGHT preview */}
        <div className="lg:col-span-7">
          <div className={`
  rounded-3xl p-4 lg:p-6 transition-colors
  ${theme==='dark' ? 'bg-neutral-900/70 border border-neutral-800' : 'bg-white border border-neutral-200'}
`}> 
            <div className="text-neutral-400 text-sm mb-3">Preview</div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
              {slides.map((s, i)=>(
                <div key={i}
      className={`
        snap-start shrink-0 w-[260px] aspect-[4/5] rounded-3xl overflow-hidden relative p-4 text-[14px] leading-[1.35]
        ${theme==='dark' ? 'bg-neutral-800' : 'bg-neutral-100'}
      `}>
                  <div className="absolute inset-0">
                    {photos[i] || photos[photos.length-1] ? (
                      <>
                        <img src={photos[i] || photos[photos.length-1]} className="w-full h-full object-cover opacity-70" />
                        <div className="absolute inset-0 bg-black/25" />
                      </>
                    ) : null}
                  </div>
                  <div className="relative z-10 h-full flex flex-col justify-end">
                    {s.lines.map((ln, k)=>(
                      <div key={k} className={theme==='dark'? 'text-neutral-100':'text-neutral-900'}>{ln}</div>
                    ))}
                    <div className={`mt-2 text-xs ${theme==='dark'?'text-neutral-300':'text-neutral-500'}`}>{username}</div>
                  </div>
                  <div className={`absolute right-3 bottom-3 text-xs ${theme==='dark'?'text-neutral-300':'text-neutral-500'}`}>{i+1}/{slides.length}</div>
                </div>
              ))}
              {!slides.length && <div className="text-neutral-500">Вставь текст ↑</div>}
            </div>
            <div className="mt-3 flex items-center gap-10">
              <Action icon={PenIcon} label="Edit"   onClick={()=>{}} />
              <Action icon={ArrowLrIcon} label="Reorder" onClick={()=>{}} />
              <Action icon={TrashIcon} label="Delete" onClick={()=>{}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

async function blobToDataURL(b: Blob){ return new Promise<string>(res=>{ const r=new FileReader(); r.onload=()=>res(String(r.result)); r.readAsDataURL(b) })}

