import { initHyphenRu } from './hyphen'

type Params = {
  text: string
  maxSlides: number
  fontFamily: string
  fontSize: number
  minFontSize: number
  lineHeight: number
  padding: number
  width: number
  height: number
}

export async function splitIntoSlides(p: Params){
  const W = p.width, H = p.height, PAD = p.padding
  const maxWidth = W - PAD*2
  const maxHeight = H - PAD*2

  const hyphenate = await initHyphenRu()?.catch(()=>null)
  const hyText = hyphenate ? await hyphenate(p.text) : p.text
  // чистим текст, разбиваем абзацы (пустая строка = новый абзац)
  const paragraphs = hyText.replace(/\r/g,'').split(/\n{2,}|\-\-\-+/g).map(s=>s.trim()).filter(Boolean)

  let size = p.fontSize
  let slides: {lines:string[], fontSize:number, lineHeight:number, padding:number, fontFamily:string}[] = []

  while (size >= p.minFontSize) {
    const ctx = getMeasureCtx(`${size}px ${p.fontFamily}`)
    const lineH = Math.round(size * p.lineHeight)
    const lines: string[] = []

    // wrap по словам
    for (const para of paragraphs) {
      const words = para.split(/\s+/)
      let line = ''
      for (const w of words) {
        const test = (line ? line + ' ' : '') + w
        if (ctx.measureText(test).width <= maxWidth) {
          line = test
        } else {
          if (line) lines.push(line)
          // слово может быть длиннее ширины — режем грубо
          if (ctx.measureText(w).width > maxWidth){
            const chunks = w.split('\u00AD')
            if (chunks.length>1){
              for (const part of chunks){
                const t = (line?line+' ':'') + part + '-'
                if (ctx.measureText(t).width <= maxWidth) line = t
                else { if (line) { lines.push(line); line=''} lines.push(part + '-') }
              }
              continue
            }
            let part = ''
            for (const ch of w){
              const t = part + ch
              if (ctx.measureText(t).width <= maxWidth) part = t
              else { lines.push(part); part = ch }
            }
            line = part
          } else {
            line = w
          }
        }
      }
      if (line) lines.push(line)
      lines.push('') // небольшой абзацный интервал (пустая строка)
    }
    if (lines.at(-1)==='') lines.pop()

    // укладываем в страницы по высоте
    slides = []
    let acc:string[] = []
    let y = 0
    for (const ln of lines){
      const h = ln==='' ? Math.round(lineH*0.6) : lineH
      if (y + h > maxHeight){
        slides.push(makeSlide(acc, size, p))
        acc = []
        y = 0
      }
      acc.push(ln)
      y += h
    }
    if (acc.length) slides.push(makeSlide(acc, size, p))

    if (slides.length <= p.maxSlides) break
    size -= 2 // уменьшаем кегль и пытаемся снова
  }

  // если перебор
  if (slides.length > p.maxSlides) {
    // если пользователь выбрал "auto" (мы передаём 10), оставляем 10
    slides = slides.slice(0, p.maxSlides)
  }
  return slides
}

function makeSlide(lines:string[], fontSize:number, p:Params){
  return {
    lines,
    fontSize,
    lineHeight: p.lineHeight,
    padding: p.padding,
    fontFamily: p.fontFamily
  }
}

let _canvas: HTMLCanvasElement | null = null
function getMeasureCtx(font: string){
  if (!_canvas){ _canvas = document.createElement('canvas') }
  const ctx = _canvas.getContext('2d')!
  ctx.font = font
  return ctx
}

