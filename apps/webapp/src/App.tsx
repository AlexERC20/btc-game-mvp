import { useEffect } from 'react';
import { useCarouselStore, useFontStore } from './state/store';
import { PreviewCarousel } from './components/Carousel/PreviewCarousel';
import BottomBar from './components/BottomBar';
import TextSheet from './components/sheets/TextSheet';
import PhotosSheet from './components/sheets/PhotosSheet';
import TemplateSheet from './components/sheets/TemplateSheet';
import LayoutSheet from './components/sheets/LayoutSheet';
import { getFontStack } from './features/fonts/fonts';

export default function App() {
  const sheet = useCarouselStore(s => s.activeSheet);
  const slides = useCarouselStore(s => s.slides);
  const fontId = useFontStore((s) => s.fontId);

  useEffect(() => {
    const stack = getFontStack(fontId);
    document.documentElement.style.setProperty('--app-font-family', stack);
  }, [fontId]);

  return (
    <>
      <PreviewCarousel slides={slides} />
      <BottomBar />
      {sheet === 'text' && <TextSheet />}
      {sheet === 'photos' && <PhotosSheet />}
      {sheet === 'template' && <TemplateSheet />}
      {sheet === 'layout' && <LayoutSheet />}
    </>
  );
}
