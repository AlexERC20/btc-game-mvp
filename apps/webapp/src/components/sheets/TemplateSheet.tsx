import Sheet from '../Sheet/Sheet';
import { useCarouselStore } from '@/state/store';
import '@/styles/photos-sheet.css';

export default function TemplateSheet() {
  const template = useCarouselStore((s) => s.style.template);
  const scope = useCarouselStore((s) => s.style.templateScope);
  const setScope = useCarouselStore((s) => s.setTemplateScope);
  const setPreset = useCarouselStore((s) => s.setTemplatePreset);
  const setTemplate = useCarouselStore((s) => s.setTemplate);
  const setFooterStyle = useCarouselStore((s) => s.setFooterStyle);
  const reset = useCarouselStore((s) => s.resetTemplate);
  const apply = useCarouselStore((s) => s.applyTemplate);
  const close = useCarouselStore((s) => s.closeSheet);

  const onDone = () => {
    apply();
    close();
  };

  const presetItems: { key: Exclude<typeof template.preset, 'custom'>; label: string }[] = [
    { key: 'editorial', label: 'Editorial' },
    { key: 'minimal', label: 'Minimal' },
    { key: 'light', label: 'Light' },
    { key: 'focus', label: 'Focus' },
    { key: 'quote', label: 'Quote' },
  ];

  return (
    <Sheet title="Template">
      <div className="template-sheet">
        <div className="actions-row">
          <button
            className={`btn-soft${template.footerStyle === 'none' ? ' is-active' : ''}`}
            onClick={() => setFooterStyle('none', scope)}
          >
            Original
          </button>
          <button
            className={`btn-soft${template.footerStyle === 'dark' ? ' is-active' : ''}`}
            onClick={() => setFooterStyle('dark', scope)}
          >
            Dark footer
          </button>
          <button
            className={`btn-soft${template.footerStyle === 'light' ? ' is-active' : ''}`}
            onClick={() => setFooterStyle('light', scope)}
          >
            Light footer
          </button>
        </div>

        <div className="section presets">
          {presetItems.map((p) => (
            <button
              key={p.key}
              className={`preset${template.preset === p.key ? ' is-active' : ''}`}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
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
                checked={template.textColorMode === c}
                onChange={() => setTemplate({ textColorMode: c as any })}
              />
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </label>
          ))}
        </div>

        <div className="section">
          <div>Accent color:</div>
          <div className="palette">
            {['#FFFFFF', '#000000', '#2D6CFF', '#FF6B00', '#22C55E', '#E11D48'].map((color) => (
              <button
                key={color}
                style={{ background: color, width: 24, height: 24, borderRadius: 4, marginRight: 4 }}
                onClick={() => setTemplate({ accent: color })}
              />
            ))}
            <input
              type="color"
              value={template.accent}
              onChange={(e) => setTemplate({ accent: e.target.value })}
            />
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

