import Sheet from '../Sheet/Sheet';
import { useCarouselStore } from '@/state/store';

export default function TemplateSheet(){
  const close = useCarouselStore(s=>s.closeSheet);
  return (
    <Sheet title="Template">
      <p>Здесь позже добавим пресеты (Minimal/Light/Focus/Quote).</p>
      <div className="sheet__footer">
        <button className="btn" onClick={close}>Close</button>
      </div>
    </Sheet>
  );
}
