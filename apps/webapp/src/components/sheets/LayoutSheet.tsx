import { useState } from 'react';
import Sheet from '../Sheet/Sheet';
import { useCarouselStore } from '@/state/store';
import '@/styles/photos-sheet.css';

export default function LayoutSheet() {
  const layout = useCarouselStore((s) => s.style.layout);
  const scope = useCarouselStore((s) => s.style.layoutScope);
  const setScope = useCarouselStore((s) => s.setLayoutScope);
  const setLayout = useCarouselStore((s) => s.setLayout);
  const reset = useCarouselStore((s) => s.resetLayout);
  const apply = useCarouselStore((s) => s.applyLayout);
  const close = useCarouselStore((s) => s.closeSheet);
  const showNickname = useCarouselStore((s) => s.style.template.showNickname);
  const [safeArea, setSafeArea] = useState(false);

  const onDone = () => {
    apply();
    close();
  };

  return (
    <Sheet title="Layout">
      <div className="layout-sheet">
        <div className="section">
          <div>Vertical:</div>
          {['top', 'middle', 'bottom'].map((p) => (
            <label key={p}>
              <input
                type="radio"
                name="vPos"
                value={p}
                checked={layout.vPos === p}
                onChange={() => setLayout({ vPos: p as any })}
              />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </label>
          ))}
          <label>
            Vertical offset
            <input
              type="range"
              min={-40}
              max={40}
              step={1}
              value={layout.vOffset}
              onChange={(e) => setLayout({ vOffset: Number(e.target.value) })}
            />
          </label>
          <div>Horizontal:</div>
          {['left', 'center', 'right'].map((p) => (
            <label key={p}>
              <input
                type="radio"
                name="hAlign"
                value={p}
                checked={layout.hAlign === p}
                onChange={() => setLayout({ hAlign: p as any })}
              />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={safeArea}
              onChange={(e) => setSafeArea(e.target.checked)}
            />
            Safe area guides
          </label>
        </div>

        <div className="section">
          <label>
            Font size
            <input
              type="range"
              min={20}
              max={40}
              step={1}
              value={layout.fontSize}
              onChange={(e) => setLayout({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label>
            Line height
            <input
              type="range"
              min={1}
              max={1.6}
              step={0.05}
              value={layout.lineHeight}
              onChange={(e) => setLayout({ lineHeight: Number(e.target.value) })}
            />
          </label>
          <label>
            Block width
            <input
              type="range"
              min={60}
              max={100}
              step={1}
              value={layout.blockWidth}
              onChange={(e) => setLayout({ blockWidth: Number(e.target.value) })}
            />
          </label>
          <label>
            Padding
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={layout.padding}
              onChange={(e) => setLayout({ padding: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="section">
          <label>
            Max lines
            <input
              type="number"
              min={1}
              max={8}
              value={layout.maxLines}
              onChange={(e) => setLayout({ maxLines: Number(e.target.value) })}
            />
          </label>
          <label>
            Paragraph gap
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={layout.paraGap}
              onChange={(e) => setLayout({ paraGap: Number(e.target.value) })}
            />
          </label>
          <div>
            Overflow:
            {['wrap', 'fade'].map((o) => (
              <label key={o}>
                <input
                  type="radio"
                  name="overflow"
                  value={o}
                  checked={layout.overflow === o}
                  onChange={() => setLayout({ overflow: o as any })}
                />
                {o === 'wrap' ? 'Wrap' : 'Fade'}
              </label>
            ))}
          </div>
        </div>

        <div className="section" aria-disabled={!showNickname}>
          <div>Nickname</div>
          <div>
            Position:
            {['left', 'center', 'right'].map((p) => (
              <label key={p}>
                <input
                  type="radio"
                  name="nickPos"
                  value={p}
                  checked={layout.nickPos === p}
                  onChange={() => setLayout({ nickPos: p as any })}
                  disabled={!showNickname}
                />
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>
          <label>
            Offset
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={layout.nickOffset}
              onChange={(e) => setLayout({ nickOffset: Number(e.target.value) })}
              disabled={!showNickname}
            />
          </label>
          <div>
            Size:
            {['s', 'm', 'l'].map((s) => (
              <label key={s}>
                <input
                  type="radio"
                  name="nickSize"
                  value={s}
                  checked={layout.nickSize === s}
                  onChange={() => setLayout({ nickSize: s as any })}
                  disabled={!showNickname}
                />
                {s.toUpperCase()}
              </label>
            ))}
          </div>
          <label>
            Opacity
            <input
              type="range"
              min={30}
              max={100}
              step={1}
              value={layout.nickOpacity}
              onChange={(e) => setLayout({ nickOpacity: Number(e.target.value) })}
              disabled={!showNickname}
            />
          </label>
          <label>
            Corner radius
            <input
              type="range"
              min={8}
              max={999}
              step={1}
              value={layout.nickRadius}
              onChange={(e) => setLayout({ nickRadius: Number(e.target.value) })}
              disabled={!showNickname}
            />
          </label>
        </div>

        <div className="section">
          <div>
            Text shadow:
            {[0, 1, 2, 3].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name="layoutTextShadow"
                  value={n}
                  checked={layout.textShadow === n}
                  onChange={() => setLayout({ textShadow: n as any })}
                />
                {n}
              </label>
            ))}
          </div>
          <label>
            Gradient intensity
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={layout.gradient}
              onChange={(e) => setLayout({ gradient: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="section">
          Apply to:
          {['all', 'current'].map((sc) => (
            <label key={sc}>
              <input
                type="radio"
                name="applyScopeLayout"
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
        <button className="btn" onClick={reset}>Reset layout</button>
        <button className="btn-soft" onClick={onDone}>Done</button>
      </div>
    </Sheet>
  );
}

