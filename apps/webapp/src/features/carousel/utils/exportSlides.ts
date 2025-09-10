import { renderSlideToCanvas, Slide, OverlayOpts } from '../lib/canvasRender';

type TextOpts = {
  font: string;
  size: number;
  lineHeight: number;
  align: CanvasTextAlign;
  color: string;
  titleColor: string;
  titleEnabled: boolean;
};

type ExportOpts = {
  w: number;
  h: number;
  overlay: OverlayOpts;
  text: TextOpts;
  username: string;
};

export async function exportSlides(slides: Slide[], opts: ExportOpts): Promise<Blob[]> {
  const out: Blob[] = [];
  for (let i = 0; i < slides.length; i++) {
    const canvas = await renderSlideToCanvas(
      { ...(slides[i] as any), index: i },
      { ...opts, text: { ...opts.text, content: (slides[i] as any).body || '' }, total: slides.length }
    );
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/png', 1)
    );
    out.push(blob);
  }
  return out;
}
