import Sheet from '../Sheet/Sheet';
import { useCarouselStore } from '@/state/store';

export default function LayoutSheet(){
  const close = useCarouselStore(s=>s.closeSheet);
  return (
    <Sheet title="Layout">
      <p>
        Сюда переехали настройки: размер текста, межстрочный интервал,
        позиция (top/bottom). Штатные контролы можно добавить позже.
      </p>
      <div className="sheet__footer">
        <button className="btn" onClick={close}>Close</button>
      </div>
    </Sheet>
  );
}
