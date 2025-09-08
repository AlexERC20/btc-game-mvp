export type SplitOptions = {
  maxCharsPerSlide?: number; // quick hack + fallback
  bullets?: boolean;
};

export function splitIntoSlides(input: string, opts: SplitOptions = {}) {
  const max = opts.maxCharsPerSlide ?? 280; // tuned for 1080x1350 + normal font
  const parts: string[] = [];

  // prioritize splitting by empty lines/paragraphs
  const blocks = input
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean);

  let buf = "";
  for (const b of blocks) {
    if ((buf + "\n\n" + b).trim().length <= max) {
      buf = (buf ? buf + "\n\n" : "") + b;
    } else {
      if (buf) parts.push(buf);
      // if block too big – cut by sentences
      const sents = b.split(/(?<=[\.\!\?])\s+/);
      let run = "";
      for (const s of sents) {
        if ((run + " " + s).trim().length <= max) run = (run ? run+" " : "") + s;
        else { if (run) parts.push(run); run = s; }
      }
      if (run) parts.push(run);
      buf = "";
    }
  }
  if (buf) parts.push(buf);

  // limit to 10 just in case
  return parts.slice(0, 10);
}
