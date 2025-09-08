export type SlideSpec = { title?:string; subtitle?:string; body?:string[] }

export function makeStory(base: string, n: number): SlideSpec[] {
  // разбить исходный текст на предложения
  const sentences = base.split(/(?<=[\.\!\?])\s+/).map(s=>s.trim()).filter(Boolean)

  const hero = sentences[0] ?? 'Сделай шаг сегодня.'
  const rest = sentences.slice(1)

  const out: SlideSpec[] = []

  if (n === 1) {
    out.push({ title: hero, subtitle: rest[0] ?? '' })
    return out
  }

  // 1-й — Hero
  out.push({ title: hero, subtitle: rest[0] ?? '' })

  // далее — распределяем
  const chunks = chunkText(rest.slice(1), n-1)
  for (const ch of chunks) out.push({ body: ch })

  return out
}

function chunkText(sentences: string[], blocks: number){
  const per = Math.ceil(sentences.length / Math.max(blocks,1))
  const arr: string[][] = []
  for (let i=0;i<blocks;i++){
    const part = sentences.slice(i*per,(i+1)*per)
    if (part.length) arr.push(part)
  }
  // если предложений мало — добиваем «мотивационными» болванками
  while (arr.length < blocks) arr.push(['Действуй. Маленькие шаги дают большой результат.'])
  return arr
}

