import React, { useEffect, useMemo, useRef, useState } from 'react'
import { splitIntoSlides } from './core/text-split'
import { renderSlide } from './core/render'
import './styles/tailwind.css'

type SlideCount = 'auto' | 3 | 5 | 8 | 10

export default function App() {
  const [text, setText] = useState<string>('')
  const [count, setCount] = useState<SlideCount>('auto')
  const [username, setUsername] = useState<string>('@username')
  const [photos, setPhotos] = useState<string[]>([]) // dataURL массив
  const [fontReady, setFontReady] = useState(false)

  // грузим Inter как FontFace, чтобы метрики были точные
  useEffect(() => {
    const f = new FontFace('Inter', 'url(https://fonts.gstatic.com/s/inter/v13/UcCO3Fwr0gYb.woff2)')
    f.load().then(ff => {
      (document as any).fonts.add(ff)
      setFontReady(true)
    }).catch(()=>setFontReady(true))
  }, [])

  // считаем слайды при каждом изменении
  const slides = useMemo(() => {
    if (!fontReady) return []
    const hardMax = count === 'auto' ? 10 : count
    return splitIntoSlides({
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
    // рендерим/скачиваем последовательно
    for (let i=0; i<slides.length; i++) {
      const bg = photos[i] || photos[photos.length-1] || '' // повторяем последнее, если фоток меньше
      const blob = await renderSlide({
        lines: slides[i].lines,
        fontFamily: slides[i].fontFamily,
        fontSize: slides[i].fontSize,
        lineHeight: slides[i].lineHeight,
        padding: slides[i].padding,
        width: 1080,
        height: 1350,
        pageIndex: i+1,
        total: slides.length,
        username,
        backgroundDataURL: bg
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `slide_${String(i+1).padStart(2,'0')}.jpg`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
      await delay(120) // чтобы iOS не «слиплась»
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
        {/* LEFT */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
            <label className="block text-sm text-neutral-400 mb-2">Text</label>
            <textarea
              placeholder="Вставь текст сюда…"
              className="w-full h-40 p-4 rounded-xl bg-neutral-950 border border-neutral-800 outline-none placeholder:text-neutral-500"
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
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm w-full"
                value={username}
                onChange={e=>setUsername(e.target.value)}
                placeholder="@username"
              />
              <button className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm" onClick={onSaveAll} disabled={!slides.length}>
                Save all
              </button>
            </div>
          </div>

          {/* Toolbar (заглушки) */}
          <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-3 flex flex-wrap gap-2 text-sm">
            <span className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700">Template</span>
            <span className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800">Color</span>
            <span className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800">Layout</span>
            <span className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800">Photos</span>
            <span className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800">Info</span>
            <span className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800">Export</span>
          </div>
        </div>

        {/* RIGHT preview */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-4 lg:p-6">
            <div className="text-neutral-400 text-sm mb-3">Preview</div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {slides.map((s, i)=>(
                <div key={i} className="shrink-0 w-[260px] aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-800 relative p-4 text-[14px] leading-[1.35]">
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
                      <div key={k} className="text-neutral-100">{ln}</div>
                    ))}
                    <div className="mt-2 text-neutral-300 text-xs">{username}</div>
                  </div>
                  <div className="absolute right-3 bottom-3 text-neutral-300 text-xs">{i+1}/{slides.length}</div>
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

function delay(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
async function blobToDataURL(b: Blob){ return new Promise<string>(res=>{ const r=new FileReader(); r.onload=()=>res(String(r.result)); r.readAsDataURL(b) })}

