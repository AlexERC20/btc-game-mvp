export type LayoutInput = {
  frame: import('@/state/store').FrameSpec;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  position: 'top' | 'bottom';
  title?: string;
  body: string;
};

export type TextBlock = {
  lines: string[];
  box: { x: number; y: number; w: number; h: number };
};

export async function computeLayout(i: LayoutInput): Promise<{ title?: TextBlock; body: TextBlock }> {
  await (document as any).fonts?.ready?.catch?.(() => {});
  const w = i.frame.width - i.frame.paddingX * 2;
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.canvas.width = i.frame.width;
  ctx.canvas.height = i.frame.height;
  ctx.font = `${i.fontSize}px ${i.fontFamily}`;
  const lh = Math.round(i.fontSize * i.lineHeight);

  const wrap = (text: string) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const probe = cur ? cur + ' ' + word : word;
      if (ctx.measureText(probe).width <= w) {
        cur = probe;
      } else {
        if (cur) lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    const h = lines.length * lh;
    return { lines, h };
  };

  const titleBlock = i.title ? wrap(i.title) : undefined;
  const bodyBlock = wrap(i.body);

  const totalH = (titleBlock?.h ?? 0) + (titleBlock ? Math.round(lh * 0.6) : 0) + bodyBlock.h;

  let y: number;
  if (i.position === 'bottom') {
    y =
      i.frame.height -
      i.frame.paddingBottom -
      i.frame.safeNickname -
      i.frame.safePagination -
      totalH;
  } else {
    y = i.frame.paddingTop;
  }

  let yCursor = y;
  const titleTB =
    titleBlock && {
      lines: titleBlock.lines,
      box: { x: i.frame.paddingX, y: yCursor, w, h: titleBlock.h },
    };
  if (titleBlock) yCursor += titleBlock.h + Math.round(lh * 0.6);

  const bodyTB = {
    lines: bodyBlock.lines,
    box: { x: i.frame.paddingX, y: yCursor, w, h: bodyBlock.h },
  };

  return { title: titleTB, body: bodyTB };
}
