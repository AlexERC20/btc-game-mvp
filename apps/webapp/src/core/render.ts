export async function renderSlide(opts: {
  lines: string[]
  width: number
  height: number
  padding: number
  fontFamily: string
  fontSize: number
  lineHeight: number
  pageIndex: number
  total: number
  username: string
  backgroundDataURL?: string
  title?: string
  subtitle?: string
  align?: 'top' | 'bottom'
}): Promise<Blob> {
  const { width:W, height:H, padding:PAD } = opts
  const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H
  const ctx = cvs.getContext('2d')!

  // фон
  ctx.fillStyle = '#121212'; ctx.fillRect(0,0,W,H)

  let avgLumUnderText = 0.1
  if (opts.backgroundDataURL){
    const img = await loadImage(opts.backgroundDataURL)
    const r = Math.max(W/img.width, H/img.height)
    const w = img.width*r, h = img.height*r
    const x = (W - w)/2, y = (H - h)/2
    ctx.drawImage(img, x,y,w,h)

    // оцениваем среднюю яркость под текстовой областью
    const sx = PAD, sy = PAD, sw = W - PAD*2, sh = H - PAD*2
    const sample = ctx.getImageData(sx,sy,sw,sh).data
    let sum = 0
    for (let i=0;i<sample.length;i+=4){
      const r=sample[i], g=sample[i+1], b=sample[i+2]
      // относительная яркость
      sum += (0.2126*r + 0.7152*g + 0.0722*b)/255
    }
    avgLumUnderText = sum / (sample.length/4)

    // динамический оверлей: чем светлее фон, тем темнее слой
    const overlay = clamp(0.15 + (avgLumUnderText-0.4)*0.4, 0.15, 0.32)
    ctx.fillStyle = `rgba(0,0,0,${overlay.toFixed(3)})`
    ctx.fillRect(0,0,W,H)
  }

  // цвет текста по контрасту
  const textIsLight = avgLumUnderText < 0.5
  const textColor = textIsLight ? '#F5F5F5' : '#111111'
  const subColor  = textIsLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'

  const lh = Math.round(opts.fontSize * opts.lineHeight)
  const gap = Math.round(lh * 0.6)

  // --- pre-calc heights for title/subtitle/body ---
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`
  let blockH = opts.lines.reduce((h, ln) => h + (ln === '' ? gap : lh), 0)

  let titleLines: string[] = []
  let titleSize = Math.round(opts.fontSize * 1.0)
  let titleLH = Math.round(titleSize * 1.15)
  const pillPadX = 22, pillPadY = 12
  let pillW = 0, pillH = 0
  if (opts.title) {
    ctx.font = `${titleSize}px ${opts.fontFamily}`
    titleLines = wrap(ctx, opts.title, (opts.width - opts.padding*2) - pillPadX*2)
    pillW = Math.max(...titleLines.map(ln => ctx.measureText(ln).width), 0) + pillPadX*2
    pillH = titleLines.length * titleLH + pillPadY*2
    blockH += pillH + Math.round(titleLH*0.6)
  }

  let subLines: string[] = []
  const subSize = Math.round(opts.fontSize * 0.82)
  const subLH = Math.round(subSize * 1.28)
  if (opts.subtitle) {
    ctx.font = `${subSize}px ${opts.fontFamily}`
    subLines = wrap(ctx, opts.subtitle, opts.width - opts.padding*2)
    blockH += subLines.length * subLH + Math.round(subLH*0.4)
  }

  const usernameSize = Math.round(opts.fontSize * 0.65)
  const bottomMetaH = usernameSize + 6

  let y = opts.padding
  if ((opts.align ?? 'bottom') === 'bottom') {
    y = opts.height - opts.padding - bottomMetaH - blockH
    if (y < opts.padding) y = opts.padding
  }

  ctx.textBaseline = 'top'

  // --- HERO title pill ---
  if (opts.title) {
    ctx.font = `${titleSize}px ${opts.fontFamily}`
    roundRect(ctx, opts.padding, y, pillW, pillH, 14)
    ctx.fillStyle = '#5B4BFF'; ctx.globalAlpha = 0.95; ctx.fill(); ctx.globalAlpha = 1
    ctx.fillStyle = '#FFFFFF'
    let ty = y + pillPadY
    for (const ln of titleLines){ ctx.fillText(ln, opts.padding + pillPadX, ty); ty += titleLH }
    y += pillH + Math.round(titleLH*0.6)
  }

  // --- Subtitle ---
  if (opts.subtitle) {
    ctx.font = `${subSize}px ${opts.fontFamily}`
    ctx.fillStyle = subColor
    for (const ln of subLines){ ctx.fillText(ln, opts.padding, y); y += subLH }
    y += Math.round(subLH*0.4)
  }

  // --- Body ---
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`
  ctx.fillStyle = textColor
  for (const ln of opts.lines){
    const step = ln === '' ? gap : lh
    if (ln) ctx.fillText(ln, opts.padding, y)
    y += step
  }

  // mini-username at top-left
  ctx.font = `${Math.round(opts.fontSize*0.55)}px ${opts.fontFamily}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'left'
  ctx.fillText('@' + opts.username.replace(/^@/,''), opts.padding, opts.padding)

  // big username bottom-left
  ctx.font = `${usernameSize}px ${opts.fontFamily}`
  ctx.fillStyle = subColor
  ctx.fillText('@' + opts.username.replace(/^@/,''), PAD, H - PAD - usernameSize - 6)

  // page index
  ctx.textAlign = 'right'
  ctx.fillText(`${opts.pageIndex}/${opts.total}`, W - PAD, H - PAD)

  // arrow near pager
  ctx.textAlign = 'left'
  ctx.fillText('→', W - PAD - 18, H - PAD - usernameSize - 6)

  return await new Promise<Blob>(res => cvs.toBlob(b => res(b!), 'image/jpeg', 0.92)!)
}

function wrap(ctx:CanvasRenderingContext2D, text:string, max:number){
  const out:string[] = []; let line=''
  for (const w of text.split(/\s+/)){
    const t = line ? line+' '+w : w
    if (ctx.measureText(t).width <= max) line = t
    else { if (line) out.push(line); line = w }
  }
  if (line) out.push(line)
  return out
}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r)
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath()
}
function clamp(n:number, a:number, b:number){ return Math.max(a, Math.min(b, n)) }
function loadImage(src:string){ return new Promise<HTMLImageElement>((resolve, reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src }) }
