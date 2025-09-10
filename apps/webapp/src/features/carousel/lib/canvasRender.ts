export type Slide = {
  id: string;
  image?: string;
  thumb?: string;
};

export type OverlayOpts = {
  enabled: boolean;
  heightPct: number;
  intensity: number;
};

export function drawOverlayGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  { enabled, heightPct, intensity }: OverlayOpts
) {
  if (!enabled) return;
  const overlayH = Math.round(h * (heightPct / 100));
  const g = ctx.createLinearGradient(0, h - overlayH, 0, h);
  const a = Math.min(0.18 * intensity, 0.6);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, `rgba(0,0,0,0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, h - overlayH, w, overlayH);
}

async function drawImageFit(
  ctx: CanvasRenderingContext2D,
  src: string,
  w: number,
  h: number
) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  try {
    await img.decode();
  } catch (err) {
    console.warn('Image load failed', src, err);
    return;
  }
  const r = Math.max(w / img.width, h / img.height);
  const nw = img.width * r;
  const nh = img.height * r;
  const dx = (w - nw) / 2;
  const dy = (h - nh) / 2;
  try {
    ctx.drawImage(img, dx, dy, nw, nh);
  } catch (err) {
    console.warn('drawImage failed', src, err);
  }
}

function drawSlideText(
  ctx: CanvasRenderingContext2D,
  text: string | undefined,
  opts: {
    font: string;
    size: number;
    lineHeight: number;
    align: CanvasTextAlign;
    color: string;
    titleColor: string;
    titleEnabled: boolean;
  }
) {
  if (!text) return;
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align;
  ctx.font = `${opts.size}px ${opts.font}`;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, ctx.canvas.width / 2, 100 + i * opts.size * opts.lineHeight);
  });
}

function drawUsernameAndPager(
  ctx: CanvasRenderingContext2D,
  username: string,
  index: number,
  total: number
) {
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(username, 12, 24);
  ctx.textAlign = 'right';
  ctx.fillText(`${index + 1}/${total}`, ctx.canvas.width - 12, 24);
}

export async function renderSlideToCanvas(
  slide: Slide & { index: number },
  settings: {
    w: number;
    h: number;
    overlay: OverlayOpts;
    text: {
      font: string;
      size: number;
      lineHeight: number;
      align: CanvasTextAlign;
      color: string;
      titleColor: string;
      titleEnabled: boolean;
      content?: string;
    };
    username: string;
    total: number;
  }
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = settings.w;
  canvas.height = settings.h;
  const ctx = canvas.getContext('2d')!;
  if (slide.image) {
    await drawImageFit(ctx, slide.image, settings.w, settings.h);
  }
  drawOverlayGradient(ctx, settings.w, settings.h, settings.overlay);
  drawSlideText(ctx, settings.text.content, settings.text);
  drawUsernameAndPager(ctx, settings.username, slide.index, settings.total);
  return canvas;
}

export async function renderSlideToBlob(
  slide: Slide & { index: number },
  settings: Parameters<typeof renderSlideToCanvas>[1],
  type: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  const canvas = await renderSlideToCanvas(slide, settings);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality);
  });
}
