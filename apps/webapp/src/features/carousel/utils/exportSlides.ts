import { renderSlideToBlob, Slide, OverlayOpts } from '../lib/canvasRender';

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
  const res: Blob[] = [];
  for (let i = 0; i < slides.length; i++) {
    const blob = await renderSlideToBlob(
      { ...(slides[i] as any), index: i },
      { ...opts, text: { ...opts.text, content: (slides[i] as any).body || '' }, total: slides.length },
      'image/png',
      1
    );
    res.push(blob);
  }
  return res;
}
