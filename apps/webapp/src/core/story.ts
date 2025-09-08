export type SlideSpec = { title?: string; subtitle?: string; body?: string[] }

export function makeStory(raw: string, n: number): SlideSpec[] {
  const cleaned = raw
    .replace(/\r/g, "")
    .split(/\n{2,}/)                 // по двойному переносу
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => b.replace(/^Слайд\s*\d+[:\-]?\s*$/i, "").trim()) // игнор "Слайд 2"
    .filter(Boolean);

  const out: SlideSpec[] = [];
  if (!cleaned.length) return out;

  // HERO
  const firstLines = cleaned[0].split(/\n/).map(s => s.trim()).filter(Boolean);
  const heroTitle = firstLines[0] || "Начни с малого.";
  const heroSub   = firstLines[1] || "";
  out.push({ title: heroTitle, subtitle: heroSub });

  const rest = cleaned.slice(1);
  if (n === 1) return out;

  // равномерно режем оставшееся
  const need = n - 1;
  const mergedSentences = rest
    .join(" ")
    .split(/(?<=[\.\!\?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const per = Math.ceil(mergedSentences.length / Math.max(need, 1));
  for (let i=0;i<need;i++) {
    const chunk = mergedSentences.slice(i*per, (i+1)*per);
    out.push({ body: chunk.length ? chunk : ["Действуй. Маленькие шаги дают большой результат."] });
  }
  return out;
}

