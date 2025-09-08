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
  theme?: "light" | "dark" | "photo"
}): Promise<Blob> {
  const { width: W, height: H, padding: PAD } = opts
  const cvs = document.createElement("canvas")
  cvs.width = W; cvs.height = H
  const ctx = cvs.getContext("2d")!

  // фон, если нет фото/или тема не photo
  if (!opts.backgroundDataURL || opts.theme !== "photo") {
    ctx.fillStyle = opts.theme === "dark" ? "#121212" : "#FFFFFF"
    ctx.fillRect(0,0,W,H)
  }

  let avgLumUnderText = 0.1
  if (opts.backgroundDataURL) {
    const img = await loadImage(opts.backgroundDataURL)
    const r = Math.max(W/img.width, H/img.height)
    const w = img.width*r, h = img.height*r
    const x = (W-w)/2, y = (H-h)/2
    ctx.drawImage(img, x,y,w,h)

    // средняя яркость под текстовой областью
    const sx = PAD, sy = PAD, sw = W-PAD*2, sh = H-PAD*2
    const data = ctx.getImageData(sx,sy,sw,sh).data
    let sum = 0
    for (let i=0;i<data.length;i+=4){
      const r=data[i], g=data[i+1], b=data[i+2]
      sum += (0.2126*r + 0.7152*g + 0.0722*b)/255
    }
    avgLumUnderText = sum / (data.length/4)

    // динамический оверлей (в светлой теме делаем слабее)
    if (opts.theme !== "light") {
      const overlay = clamp(0.15 + (avgLumUnderText-0.4)*0.4, 0.15, 0.32)
      ctx.fillStyle = `rgba(0,0,0,${overlay.toFixed(3)})`
      ctx.fillRect(0,0,W,H)
    }
  }

  // нижний градиент для читаемости текста
  const grad = ctx.createLinearGradient(0, H*0.65, 0, H)
  grad.addColorStop(0, "rgba(0,0,0,0)")
  grad.addColorStop(1, "rgba(0,0,0,0.28)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  const textIsLight = avgLumUnderText < 0.5 || opts.theme === "dark"
  const textColor = textIsLight ? "#F5F5F5" : "#111111"
  const subColor  = textIsLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)"

  // mini-username сверху слева
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.font = `${Math.round(opts.fontSize*0.55)}px ${opts.fontFamily}`
  ctx.fillStyle = subColor
  ctx.fillText("@"+opts.username.replace(/^@/,''), PAD, PAD)

  // HERO title (фиолетовая плашка)
  let yCursor = PAD
  if (opts.title){
    const pillPadX=22, pillPadY=12
    const titleSize = Math.round(opts.fontSize*1.0)
    const titleLH = Math.round(titleSize*1.15)
    ctx.font = `${titleSize}px ${opts.fontFamily}`
    const lines = wrap(ctx, opts.title, W - PAD*2 - pillPadX*2)
    const pillH = lines.length*titleLH + pillPadY*2
    roundRect(ctx, PAD, yCursor, W-PAD*2, pillH, 14)
    ctx.fillStyle = "#5B4BFF"; ctx.globalAlpha = 0.95; ctx.fill(); ctx.globalAlpha = 1
    ctx.fillStyle = "#FFFFFF"
    let ty = yCursor + pillPadY
    for (const ln of lines){ ctx.fillText(ln, PAD+pillPadX, ty); ty+=titleLH }
    yCursor += pillH + Math.round(titleLH*0.6)
  }

  // Subtitle
  if (opts.subtitle){
    const subSize = Math.round(opts.fontSize*0.82)
    const subLH = Math.round(subSize*1.28)
    ctx.font = `${subSize}px ${opts.fontFamily}`
    ctx.fillStyle = subColor
    for (const ln of wrap(ctx, opts.subtitle, W-PAD*2)){ ctx.fillText(ln, PAD, yCursor); yCursor+=subLH }
    yCursor += Math.round(subLH*0.4)
  }

  // Body: прижать к низу
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`
  const lh = Math.round(opts.fontSize*opts.lineHeight)
  const blockH = opts.lines.reduce((h, ln) => h + (ln === "" ? Math.round(lh*0.6) : lh), 0)
  let y = H - PAD - Math.round(opts.fontSize*0.65) - 6 - blockH
  if (y < PAD) y = PAD

  ctx.fillStyle = textColor
  for (const ln of opts.lines) {
    const step = ln === "" ? Math.round(lh*0.6) : lh
    if (ln) ctx.fillText(ln, PAD, y)
    y += step
  }

  // пейджер внизу справа
  ctx.textAlign = "right"
  ctx.font = `${Math.round(opts.fontSize*0.65)}px ${opts.fontFamily}`
  ctx.fillStyle = subColor
  ctx.fillText(`${opts.pageIndex}/${opts.total} →`, W - PAD, H - PAD)

  return await new Promise<Blob>(res => cvs.toBlob(b=>res(b!), 'image/jpeg', 0.92)!)
}

function wrap(ctx:CanvasRenderingContext2D, text:string, max:number){
  const out:string[]=[]; let line=''
  for (const w of text.split(/\s+/)){
    const t = line? line+' '+w : w
    if (ctx.measureText(t).width <= max) line=t
    else { if (line) out.push(line); line=w }
  }
  if (line) out.push(line)
  return out
}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r)
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r)
  ctx.closePath()
}
function clamp(n:number,a:number,b:number){ return Math.max(a, Math.min(b, n)) }
function loadImage(src:string){ return new Promise<HTMLImageElement>((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src }) }
