import { useCarouselStore } from '@/state/store';
import Sheet from '../Sheet/Sheet';
import '@/styles/text-sheet.css';

export default function TextSheet() {
  const nickname = useCarouselStore((s) => s.text.nickname);
  const bulkText = useCarouselStore((s) => s.text.bulkText);
  const setTextField = useCarouselStore((s) => s.setTextField);
  const applyTextToSlides = useCarouselStore((s) => s.applyTextToSlides);
  const close = useCarouselStore((s) => s.closeSheet);

  const onDone = () => {
    applyTextToSlides();
    close();
  };

  return (
    <Sheet title="Text">
      <div className="text-sheet">
        {/* Никнейм */}
        <label className="field">
          <div className="label">Никнейм</div>
          <input
            className="input"
            type="text"
            placeholder="@alexvoit"
            value={nickname}
            onChange={(e) => setTextField({ nickname: e.target.value })}
          />
        </label>

        {/* Многострочный текст */}
        <label className="field">
          <div className="label">Текст</div>
          <textarea
            className="textarea"
            placeholder={"Вставь текст сюда…\n\nПустая строка = следующий слайд"}
            rows={8}
            value={bulkText}
            onChange={(e) => setTextField({ bulkText: e.target.value })}
          />
        </label>
      </div>
      <div className="sheet__footer">
        <button className="btn-soft" onClick={onDone}>Done</button>
      </div>
    </Sheet>
  );
}
