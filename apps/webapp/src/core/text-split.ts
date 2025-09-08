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

export function splitIntoSlides(p: Params){
  const W = p.width, H = p.height, PAD = p.padding
  const maxWidth = W - PAD*2
  const maxHeight = H - PAD*2

  // чистим текст, разбиваем абзацы (пустая строка = новый абзац)
  const paragraphs = p.text
    .replace(/\r/g,'')
    .split(/\n{2,}|\-\-\-+/g) // поддержка разделителя ---
    .map(s=>s.trim())
    .filter(Boolean)

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

  // если всё ещё перебор, ограничим количеством страниц
  if (slides.length > p.maxSlides) slides = slides.slice(0, p.maxSlides)

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

