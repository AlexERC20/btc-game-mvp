export function splitIntoSlides(input: string, maxCharsPerSlide = 280) {
  const clean = input.replace(/\r/g, "").trim();

  // 1) Если есть явные маркеры "Слайд N" — режем по ним
  const byMarker = clean
    .split(/\n?Слайд\s*\d+[^\n]*\n?/gi)
    .map(s => s.trim())
    .filter(Boolean);
  const firstPass =
    byMarker.length > 1
      ? byMarker
      : clean.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  // 2) Ограничим объём: если блок > max — порежем по предложениям
  const out: string[] = [];
  for (const block of firstPass) {
    if (block.length <= maxCharsPerSlide) {
      out.push(block);
      continue;
    }
    const sents = block.split(/(?<=[\.\!\?])\s+/);
    let buf = "";
    for (const s of sents) {
      if ((buf + " " + s).trim().length <= maxCharsPerSlide) {
        buf = (buf ? buf + " " : "") + s;
      } else {
        if (buf) out.push(buf);
        buf = s;
      }
    }
    if (buf) out.push(buf);
  }
  return out.slice(0, 10);
}

