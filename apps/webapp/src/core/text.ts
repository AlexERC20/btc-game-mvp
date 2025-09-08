// Разбивка пользовательского текста на слайды
export function splitIntoSlides(input: string, maxCharsPerSlide = 280): string[] {
  const clean = input.replace(/\r/g, "").trim();

  // Если есть явные маркеры "Слайд N" — режем по ним
  const byMarker = clean
    .split(/\n?Слайд\s*\d+[^\n]*\n?/gi)
    .map(s => s.trim())
    .filter(Boolean);

  // Иначе — по двойным переводам строк (абзацам)
  const blocks = byMarker.length > 1
    ? byMarker
    : clean.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  const out: string[] = [];

  for (const block of blocks) {
    if (block.length <= maxCharsPerSlide) {
      out.push(block);
      continue;
    }
    // Если слишком длинный блок — режем по предложениям.
    const sents = block.split(/(?<=[.!?])\s+/);
    let buf = "";
    for (const s of sents) {
      const next = (buf ? buf + " " : "") + s;
      if (next.length <= maxCharsPerSlide) {
        buf = next;
      } else {
        if (buf) out.push(buf);
        buf = s;
      }
    }
    if (buf) out.push(buf);
  }

  // максимум 10 слайдов на MVP
  return out.slice(0, 10);
}
