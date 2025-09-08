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
}): Promise<Blob> {
  const { width:W, height:H, padding:PAD } = opts
  const cvs = document.createElement('canvas')
  cvs.width = W; cvs.height = H
  const ctx = cvs.getContext('2d')!

  // фон
  ctx.fillStyle = '#121212'
  ctx.fillRect(0,0,W,H)

  if (opts.backgroundDataURL){
    const img = await loadImage(opts.backgroundDataURL)
    // вписываем, cover
    const r = Math.max(W/img.width, H/img.height)
    const w = img.width*r, h = img.height*r
    const x = (W - w)/2, y = (H - h)/2
    ctx.globalAlpha = 0.9
    ctx.drawImage(img, x,y,w,h)
    ctx.globalAlpha = 1
    // затемняющий оверлей
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(0,0,W,H)
  }

  // текст
  ctx.textBaseline = 'top'
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`
  const lh = Math.round(opts.fontSize * opts.lineHeight)
  let y = PAD

  for (const ln of opts.lines){
    if (ln===''){ y+= Math.round(lh*0.6); continue }
    // белый/чёрный по месту — семплим фон под строкой (просто: берём тёмный)
    ctx.fillStyle = '#F5F5F5'
    ctx.fillText(ln, PAD, y)
    y += lh
  }

  // username
  ctx.font = `${Math.round(opts.fontSize*0.65)}px ${opts.fontFamily}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(opts.username, PAD, H - PAD - Math.round(opts.fontSize*0.65) - 6)

  // номер страницы
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText(`${opts.pageIndex}/${opts.total}`, W - PAD, H - PAD)

  return await new Promise<Blob>(res => cvs.toBlob(b => res(b!), 'image/jpeg', 0.92))
}

function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve, reject)=>{
    const img = new Image()
    img.onload = ()=>resolve(img)
    img.onerror = reject
    img.src = src
  })
}

