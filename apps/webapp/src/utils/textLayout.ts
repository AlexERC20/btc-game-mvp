import type { Typography } from '@/styles/typography';
import { typographyToCanvasFont } from '@/styles/typography';

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

export type LineMetrics = {
  ascent: number;
  descent: number;
  lineHeight: number;
  baselineOffset: number;
};

const METRIC_SAMPLE = 'Mg';

const metricsCache = new WeakMap<Typography['title'] | Typography['body'], LineMetrics>();

export function lineHeightPx(style: Typography['title'] | Typography['body']) {
  return style.fontSize * style.lineHeight;
}

export function getLineMetrics(
  ctx: CanvasRenderingContext2D,
  style: Typography['title'] | Typography['body'],
): LineMetrics {
  const cached = metricsCache.get(style);
  if (cached) return cached;

  const previousFont = ctx.font;
  ctx.font = typographyToCanvasFont(style);
  const measurement = ctx.measureText(METRIC_SAMPLE);
  ctx.font = previousFont;

  const ascent = measurement.actualBoundingBoxAscent ?? style.fontSize * 0.8;
  const descent = measurement.actualBoundingBoxDescent ?? style.fontSize * 0.2;
  const naturalHeight = ascent + descent;
  const fullLineHeight = lineHeightPx(style);
  const leading = Math.max(0, fullLineHeight - naturalHeight);
  const baselineOffset = leading / 2 + ascent;

  const metrics: LineMetrics = {
    ascent,
    descent,
    lineHeight: fullLineHeight,
    baselineOffset,
  };

  metricsCache.set(style, metrics);
  return metrics;
}

export type ComposedLine = {
  text: string;
  type: 'title' | 'body';
  style: Typography['title'] | Typography['body'];
  color: string;
  letterSpacing: number;
  gapBefore: number;
  metrics: LineMetrics;
};

export type TextComposition = {
  lines: ComposedLine[];
  contentHeight: number;
  truncated: boolean;
  fadeMaskStart?: number;
};

export function composeTextLines(params: {
  ctx: CanvasRenderingContext2D;
  maxWidth: number;
  title: string;
  body: string;
  typography: Typography;
  colors: { title: string; body: string };
  paragraphGap: number;
  overflow: 'wrap' | 'fade';
  maxLines: number;
}): TextComposition {
  const {
    ctx,
    maxWidth,
    title,
    body,
    typography,
    colors,
    paragraphGap,
    overflow,
    maxLines,
  } = params;

  const lines: Array<{
    text: string;
    type: 'title' | 'body';
    style: Typography['title'] | Typography['body'];
    color: string;
    letterSpacing: number;
    gapBefore: number;
  }> = [];

  if (title) {
    ctx.font = typographyToCanvasFont(typography.title);
    const titleLines = layoutParagraph(
      ctx,
      title,
      maxWidth,
      typography.title.lineHeight,
      typography.title.letterSpacing,
    );
    for (const text of titleLines) {
      lines.push({
        text,
        type: 'title',
        style: typography.title,
        color: colors.title,
        letterSpacing: typography.title.letterSpacing,
        gapBefore: 0,
      });
    }
  }

  if (body) {
    ctx.font = typographyToCanvasFont(typography.body);
    const bodyLines = layoutParagraph(
      ctx,
      body,
      maxWidth,
      typography.body.lineHeight,
      typography.body.letterSpacing,
    );
    bodyLines.forEach((text, index) => {
      lines.push({
        text,
        type: 'body',
        style: typography.body,
        color: colors.body,
        letterSpacing: typography.body.letterSpacing,
        gapBefore: index === 0 && lines.length ? paragraphGap : 0,
      });
    });
  }

  if (!lines.length) {
    return { lines: [], contentHeight: 0, truncated: false };
  }

  const limit = maxLines > 0 ? Math.max(0, Math.min(maxLines, lines.length)) : lines.length;
  const truncated = lines.length > limit;
  const visible = lines.slice(0, limit);

  if (truncated && overflow === 'wrap' && visible.length) {
    const last = visible[visible.length - 1];
    ctx.font = typographyToCanvasFont(last.style);
    last.text = applyEllipsis(ctx, last.text, maxWidth, last.letterSpacing);
  }

  let contentHeight = 0;
  const composed: ComposedLine[] = visible.map((line) => {
    const metrics = getLineMetrics(ctx, line.style);
    contentHeight += line.gapBefore + metrics.lineHeight;
    return { ...line, metrics };
  });

  let fadeMaskStart: number | undefined;
  if (truncated && overflow === 'fade' && composed.length && contentHeight > 0) {
    const last = composed[composed.length - 1];
    const fadeHeight = Math.min(last.metrics.lineHeight * 1.4, contentHeight);
    fadeMaskStart = Math.max(0, (contentHeight - fadeHeight) / contentHeight);
  }

  return { lines: composed, contentHeight, truncated, fadeMaskStart };
}
