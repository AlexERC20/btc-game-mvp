export async function shareOrDownloadAll(blobs: Blob[]) {
  const files = blobs.map((b, i) => new File([b], `slide_${String(i+1).padStart(2,'0')}.jpg`, { type: 'image/jpeg' }))

  // 1) Лучшее: системный шэр (iOS/Android)
  if ((navigator as any).canShare && (navigator as any).canShare({ files })) {
    await (navigator as any).share({ files, title: 'Carousel' }).catch(()=>{})
    return
  }

  // 2) Открыть каждый файл во вкладке (топ для iOS Telegram)
  const isIosTg = /(iphone|ipad)/i.test(navigator.userAgent) && !!(window as any).Telegram?.WebApp
  if (isIosTg) {
    for (const f of files) {
      const url = URL.createObjectURL(f)
      window.open(url, '_blank')  // «Открыть» -> «Сохранить»
      await delay(200)
      URL.revokeObjectURL(url)
    }
    return
  }

  // 3) Стандартное скачивание якорем (Android/десктоп)
  for (const f of files) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f)
    a.download = f.name
    document.body.appendChild(a); a.click(); a.remove()
    await delay(120)
    URL.revokeObjectURL(a.href)
  }
}

export async function downloadOne(blob: Blob, name='slide.jpg') {
  const file = new File([blob], name, { type: 'image/jpeg' })

  if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
    await (navigator as any).share({ files: [file], title: name }).catch(()=>{})
    return
  }
  const url = URL.createObjectURL(file)
  const isIosTg = /(iphone|ipad)/i.test(navigator.userAgent) && !!(window as any).Telegram?.WebApp
  if (isIosTg) { window.open(url, '_blank'); await delay(200); URL.revokeObjectURL(url); return }
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

function delay(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
