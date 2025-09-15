import Sheet from '../Sheet/Sheet';
import { useCarouselStore } from '@/state/store';
import type { TemplateStyle } from '@/state/store';
import '@/styles/photos-sheet.css';

const SOFT_CLASSES = 'soft-pill';
const ACCENTS = ['#FFFFFF', '#000000', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];
const QUICK_STYLE_GROUPS: [TemplateStyle, string][][] = [
  [
    ['original', 'Original'],
    ['darkFooter', 'Dark footer'],
    ['lightFooter', 'Light footer'],
  ],
  [
    ['editorial', 'Editorial'],
    ['minimal', 'Minimal'],
    ['light', 'Light'],
    ['focus', 'Focus'],
    ['quote', 'Quote'],
  ],
];

export default function TemplateSheet() {
  const template = useCarouselStore((s) => s.style.template);
  const templateStyle = useCarouselStore((s) => s.templateStyle);
  const scope = useCarouselStore((s) => s.style.templateScope);
  const setScope = useCarouselStore((s) => s.setTemplateScope);
  const setTemplateStyle = useCarouselStore((s) => s.setTemplateStyle);
  const setTemplate = useCarouselStore((s) => s.setTemplate);
  const textColorMode = useCarouselStore((s) => s.typography.textColorMode);
  const headingAccent = useCarouselStore((s) => s.typography.headingAccent);
  const setHeadingAccent = useCarouselStore((s) => s.setHeadingAccent);
  const setTextColorMode = useCarouselStore((s) => s.setTextColorMode);
  const reset = useCarouselStore((s) => s.resetTemplate);
  const apply = useCarouselStore((s) => s.applyTemplate);
  const close = useCarouselStore((s) => s.closeSheet);

  const onDone = () => {
    apply();
    close();
  };

  return (
    <Sheet title="Template">
      <div className="template-sheet">
        <div className="template-sheet__quick">
          {QUICK_STYLE_GROUPS.map((group, idx) => (
            <div key={idx} className="template-sheet__quick-row">
              {group.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`${SOFT_CLASSES}${templateStyle === key ? ' is-active' : ''}`}
                  onClick={() => setTemplateStyle(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="section">
          <div>Text color:</div>
          {['auto', 'white', 'black'].map((c) => (
            <label key={c}>
              <input
                type="radio"
                name="textColorMode"
                value={c}
                checked={textColorMode === c}
                onChange={() => setTextColorMode(c as 'auto' | 'white' | 'black')}
              />
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </label>
          ))}
        </div>

        <div className="section">
          <div>Heading color:</div>
          <div className="swatches">
            {ACCENTS.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`swatch${headingAccent === hex ? ' is-active' : ''}`}
                style={{ background: hex }}
                onClick={() => setHeadingAccent(hex)}
                aria-label={`Accent ${hex}`}
              />
            ))}
            <button type="button" className="swatch reset" onClick={() => setHeadingAccent(null)}>
              Auto
            </button>
          </div>
          <div className="hint">
            По умолчанию заголовок = цвету текста. Выбор акцента меняет только заголовок.
          </div>
        </div>

        <div className="section">
          <label>
            Bottom gradient
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={template.bottomGradient}
              onChange={(e) => setTemplate({ bottomGradient: Number(e.target.value) })}
              disabled={template.footerStyle === 'none'}
            />
            <small>Height</small>
          </label>
          <label>
            Dim photo
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={template.dimPhoto}
              onChange={(e) => setTemplate({ dimPhoto: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="section">
          <label>
            <input
              type="checkbox"
              checked={template.showNickname}
              onChange={(e) => setTemplate({ showNickname: e.target.checked })}
            />
            Show nickname
          </label>
          <div>
            Text shadow:
            {[0, 1, 2, 3].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name="textShadow"
                  value={n}
                  checked={template.textShadow === n}
                  onChange={() => setTemplate({ textShadow: n as any })}
                />
                {n}
              </label>
            ))}
          </div>
          <div>
            Nickname style:
            {['pill', 'tag'].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name="nicknameStyle"
                  value={n}
                  checked={template.nicknameStyle === n}
                  onChange={() => setTemplate({ nicknameStyle: n as any })}
                />
                {n === 'pill' ? 'Pill' : 'Tag'}
              </label>
            ))}
          </div>
        </div>

        <div className="section">
          Font:
          {['system', 'inter', 'playfair', 'bodoni', 'dmsans'].map((f) => (
            <label key={f}>
              <input
                type="radio"
                name="font"
                value={f}
                checked={template.font === f}
                onChange={() => setTemplate({ font: f as any })}
              />
              {
                f === 'inter'
                  ? 'Inter'
                  : f === 'playfair'
                  ? 'Playfair'
                  : f === 'bodoni'
                  ? 'Bodoni'
                  : f === 'dmsans'
                  ? 'DM Sans'
                  : 'System'
              }
            </label>
          ))}
        </div>

        <div className="section">
          Apply to:
          {['all', 'current'].map((sc) => (
            <label key={sc}>
              <input
                type="radio"
                name="applyScopeTemplate"
                value={sc}
                checked={scope === sc}
                onChange={() => setScope(sc as any)}
              />
              {sc === 'all' ? 'All slides' : 'Current slide'}
            </label>
          ))}
        </div>
      </div>
      <div className="sheet__footer">
          <button className="btn" onClick={reset}>Reset preset</button>
          <button className="btn-soft" onClick={onDone}>Done</button>
      </div>
    </Sheet>
  );
}

