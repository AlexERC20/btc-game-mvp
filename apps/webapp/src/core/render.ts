export interface RenderOptions {
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
  theme?: 'light' | 'dark' | 'photo'
}

export async function renderSlide(opts: RenderOptions): Promise<Blob> {
  const { width:W, height:H, padding:PAD } = opts
  const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H
  const ctx = cvs.getContext('2d')!

  // фон
  let avgLumUnderText = opts.theme === 'dark' ? 0.1 : 0.9
  if (!opts.backgroundDataURL || opts.theme !== 'photo'){
    ctx.fillStyle = opts.theme === 'dark' ? '#121212' : '#FFFFFF'
    ctx.fillRect(0,0,W,H)
  }
  if (opts.backgroundDataURL && opts.theme==='photo'){
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

  ctx.textBaseline = 'top'
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`
  const lh = Math.round(opts.fontSize * opts.lineHeight)
  let y = PAD

  ctx.fillStyle = textColor
  for (const ln of opts.lines){
    if (ln===''){ y+= Math.round(lh*0.6); continue }
    ctx.fillText(ln, PAD, y); y += lh
  }

  // username
  const unSize = Math.round(opts.fontSize*0.65)
  ctx.font = `${unSize}px ${opts.fontFamily}`
  ctx.fillStyle = subColor
  ctx.fillText(opts.username, PAD, H - PAD - unSize - 6)

  // номер страницы
  ctx.textAlign = 'right'
  ctx.fillText(`${opts.pageIndex}/${opts.total}`, W - PAD, H - PAD)

  return await new Promise<Blob>(res => cvs.toBlob(b => res(b!), 'image/jpeg', 0.92)!)
}

function clamp(n:number, a:number, b:number){ return Math.max(a, Math.min(b, n)) }
function loadImage(src:string){ return new Promise<HTMLImageElement>((resolve, reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src }) }
