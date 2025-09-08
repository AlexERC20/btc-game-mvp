export type SplitOptions = {
  targetCount?: number;                         // желаемое кол-во слайдов
  maxChars?: number;                            // лимит символов
  maxLines?: number;                            // лимит строк
};

const normalize = (s: string) =>
  s.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();

const splitByMarkers = (s: string): string[] => {
  const parts: string[] = [];
  const re = /(?:^|\n)Слайд\s*\d+\s*:\s*/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  const idxs: number[] = [];
  while ((m = re.exec(s))) idxs.push(m.index + m[0].length);
  if (idxs.length === 0) return [s];
  for (let i = 0; i < idxs.length; i++) {
    const start = idxs[i];
    const end = i + 1 < idxs.length ? idxs[i + 1] - (s[idxs[i + 1] - 1] === '\n' ? 1 : 0) : s.length;
    parts.push(s.slice(start, end).trim());
  }
  return parts.filter(Boolean);
};

const splitByBlankLines = (s: string): string[] =>
  s.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);

const splitByLimit = (s: string, opt: Required<Pick<SplitOptions,'maxChars'|'maxLines'>>): string[] => {
  const words = s.split(/\s+/);
  const res: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = (cur ? cur + ' ' : '') + w;
    const lines = test.split('\n');
    const tooManyLines = lines.length > opt.maxLines;
    const tooManyChars = test.length > opt.maxChars;
    if (tooManyChars || tooManyLines) {
      if (cur) res.push(cur.trim());
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur.trim()) res.push(cur.trim());
  return res.length ? res : [s.trim()];
};

export function splitTextIntoSlides(input: string, mode: 'story'|'carousel', opts: SplitOptions = {}) {
  const text = normalize(input);
  const base = mode === 'story'
    ? { maxChars: opts.maxChars ?? 360, maxLines: opts.maxLines ?? 6 }
    : { maxChars: opts.maxChars ?? 480, maxLines: opts.maxLines ?? 8 };

  // 1) markers
  let parts = splitByMarkers(text);
  // 2) blank lines
  if (parts.length < 2) parts = splitByBlankLines(text);
  // 3) hard limit
  if (parts.length < 2) parts = splitByLimit(text, base);

  // Очистка и нормализация
  parts = parts.map(p => p.replace(/^Слайд\s*\d+\s*:\s*/i, '').trim());

  const target = Math.max(1, opts.targetCount || parts.length);
  if (parts.length > target) parts = parts.slice(0, target);
  if (parts.length < target) parts = parts.concat(Array(target - parts.length).fill(''));

  return parts;
}

