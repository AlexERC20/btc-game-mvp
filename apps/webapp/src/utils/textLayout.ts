export type CanvasTextContext = Pick<CanvasRenderingContext2D, 'measureText'>;

export function measureWithLetterSpacing(
  ctx: CanvasTextContext,
  text: string,
  letterSpacing: number,
): number {
  if (!text) return 0;
  const base = ctx.measureText(text).width;
  const extra = letterSpacing * Math.max(0, text.length - 1);
  return base + extra;
}

function breakLongWord(
  ctx: CanvasTextContext,
  word: string,
  maxWidth: number,
  letterSpacing: number,
  hyphenation: boolean,
): string[] {
  if (!word.length || maxWidth <= 0) return [];
  const segments: string[] = [];
  let current = '';
  const chars = Array.from(word);

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const next = current + ch;
    if (measureWithLetterSpacing(ctx, next, letterSpacing) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      if (hyphenation && measureWithLetterSpacing(ctx, `${current}-`, letterSpacing) <= maxWidth) {
        segments.push(`${current}-`);
      } else {
        segments.push(current);
      }
      current = ch;
    } else {
      segments.push(ch);
      current = '';
    }
  }

  if (current) segments.push(current);

  if (hyphenation && segments.length > 1) {
    const lastIndex = segments.length - 1;
    return segments.map((segment, index) =>
      index === lastIndex || segment.endsWith('-') ? segment : `${segment}-`,
    );
  }

  return segments;
}

export function layoutParagraph(
  ctx: CanvasTextContext,
  text: string,
  maxWidth: number,
  _lineHeight: number,
  letterSpacing: number,
  hyphenation = false,
): string[] {
  if (!text || maxWidth <= 0) return [];
  const clean = text.replace(/\r/g, '').trim();
  if (!clean) return [];

  const words = clean.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureWithLetterSpacing(ctx, candidate, letterSpacing) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = '';
    }

    if (measureWithLetterSpacing(ctx, word, letterSpacing) <= maxWidth) {
      current = word;
    } else {
      const parts = breakLongWord(ctx, word, maxWidth, letterSpacing, hyphenation);
      if (parts.length) {
        const last = parts.pop()!;
        lines.push(...parts);
        current = last;
      } else {
        current = word;
      }
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function applyEllipsis(
  ctx: CanvasTextContext,
  text: string,
  maxWidth: number,
  letterSpacing: number,
): string {
  const ellipsis = '…';
  if (!text) return ellipsis;
  if (measureWithLetterSpacing(ctx, `${text}${ellipsis}`, letterSpacing) <= maxWidth) {
    return `${text}${ellipsis}`;
  }

  const chars = Array.from(text);
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    const candidate = chars.slice(0, i).join('');
    if (!candidate) break;
    if (measureWithLetterSpacing(ctx, `${candidate}${ellipsis}`, letterSpacing) <= maxWidth) {
      return `${candidate}${ellipsis}`;
    }
  }

  return ellipsis;
}
