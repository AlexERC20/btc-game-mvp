import { saveAs } from 'file-saver';
import { renderSlideToCanvas, Slide, OverlayOpts } from '../lib/canvasRender';

interface ExportSettings {
  mode: 'story' | 'carousel';
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
  quality?: number;
}

export async function exportSlides(slides: Slide[], settings: ExportSettings) {
  const W = settings.mode === 'story' ? 1080 : 1350;
  const H = settings.mode === 'story' ? 1920 : 1080;
  for (let i = 0; i < slides.length; i++) {
    const canvas = await renderSlideToCanvas({ ...slides[i], index: i }, {
      w: W,
      h: H,
      overlay: settings.overlay,
      text: settings.text,
      username: settings.username,
      total: slides.length,
    });
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/jpeg', settings.quality ?? 0.92)
    );
    saveAs(blob, `slide-${i + 1}.jpg`);
  }
}
