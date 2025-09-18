import { useMemo } from 'react';
import Sheet from '../Sheet/Sheet';
import {
  LayoutConfig,
  useCarouselStore,
  useLayoutSelector,
  useLayoutStore,
} from '@/state/store';
import { debounce } from '@/utils/debounce';
import { SegmentGroup } from '@/ui/Segment';
import { haptic } from '@/utils/haptics';
import '@/styles/photos-sheet.css';

const VERTICAL_OPTIONS: LayoutConfig['text']['vAlign'][] = ['top', 'middle', 'bottom'];
const HORIZONTAL_OPTIONS: LayoutConfig['text']['hAlign'][] = ['left', 'center', 'right'];
const OVERFLOW_OPTIONS: LayoutConfig['text']['overflow'][] = ['wrap', 'fade'];
const NICKNAME_SIZES: LayoutConfig['nickname']['size'][] = ['S', 'M', 'L'];
const TEXT_SHADOW_OPTIONS: LayoutConfig['textShadow'][] = [0, 1, 2, 3];

function formatPx(value: number) {
  return `${Math.round(value)}px`;
}

export default function LayoutSheet() {
  const layout = useLayoutSelector((state) => ({
    text: state.text,
    vOffset: state.vOffset,
    paragraphGap: state.paragraphGap,
    cornerRadius: state.cornerRadius,
    fontSize: state.fontSize,
    nickname: state.nickname,
    textShadow: state.textShadow,
    gradientIntensity: state.gradientIntensity,
  }));
  const set = useLayoutStore((state) => state.set);
  const setText = useLayoutStore((state) => state.setText);
  const setNickname = useLayoutStore((state) => state.setNickname);
  const reset = useLayoutStore((state) => state.reset);
  const close = useCarouselStore((s) => s.closeSheet);
  const showNickname = useCarouselStore((s) => s.style.template.showNickname);

  const setDebounced = useMemo(() => debounce(set, 16), [set]);
  const setTextDebounced = useMemo(() => debounce(setText, 16), [setText]);
  const setNicknameDebounced = useMemo(() => debounce(setNickname, 16), [setNickname]);

  const blockWidthLabel =
    layout.text.blockWidth <= 0 ? 'Auto' : formatPx(layout.text.blockWidth);
  const paddingLabel = formatPx(layout.text.padding);
  const paragraphGapLabel = formatPx(layout.paragraphGap);
  const cornerRadiusLabel = formatPx(layout.cornerRadius);
  const vOffsetLabel = layout.vOffset === 0 ? '0' : formatPx(layout.vOffset);
  const nicknameOffsetLabel = formatPx(layout.nickname.offset);
  const nicknameOpacityValue = Math.round(layout.nickname.opacity * 100);
  const gradientValue = Math.round(layout.gradientIntensity * 100);

  const onDone = () => {
    close();
  };

  return (
    <Sheet title="Layout">
      <div className="layout-sheet">
        <div className="section">
          <div>Vertical</div>
          <SegmentGroup
            value={layout.text.vAlign}
            onChange={(value) => setText('vAlign', value)}
            items={VERTICAL_OPTIONS.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
          />
          <label>
            Vertical offset
            <input
              type="range"
              min={-400}
              max={400}
              step={4}
              value={layout.vOffset}
              onChange={(event) => setDebounced('vOffset', Number(event.target.value))}
            />
            <small>{vOffsetLabel}</small>
          </label>
          <div>Horizontal</div>
          <SegmentGroup
            value={layout.text.hAlign}
            onChange={(value) => setText('hAlign', value)}
            items={HORIZONTAL_OPTIONS.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
          />
          <div>Safe area</div>
          <SegmentGroup
            value={layout.text.safeArea ? 'on' : 'off'}
            onChange={(value) => setText('safeArea', value === 'on')}
            items={[{ value: 'on', label: 'Safe' }, { value: 'off', label: 'Edge' }]}
          />
        </div>

        <div className="section">
          <label>
            Block width
            <input
              type="range"
              min={0}
              max={1080}
              step={10}
              value={layout.text.blockWidth}
              onChange={(event) => setTextDebounced('blockWidth', Number(event.target.value))}
            />
            <small>{blockWidthLabel}</small>
          </label>
          <label>
            Padding
            <input
              type="range"
              min={0}
              max={240}
              step={4}
              value={layout.text.padding}
              onChange={(event) => setTextDebounced('padding', Number(event.target.value))}
            />
            <small>{paddingLabel}</small>
          </label>
          <label>
            Corner radius
            <input
              type="range"
              min={0}
              max={120}
              step={4}
              value={layout.cornerRadius}
              onChange={(event) => setDebounced('cornerRadius', Number(event.target.value))}
            />
            <small>{cornerRadiusLabel}</small>
          </label>
        </div>

        <div className="section">
          <label>
            Font size
            <input
              type="range"
              min={16}
              max={72}
              step={1}
              value={layout.fontSize}
              onChange={(event) => setDebounced('fontSize', Number(event.target.value))}
            />
            <small>{formatPx(layout.fontSize)}</small>
          </label>
          <label>
            Line height
            <input
              type="range"
              min={1}
              max={1.8}
              step={0.05}
              value={layout.text.lineHeight}
              onChange={(event) => setTextDebounced('lineHeight', Number(event.target.value))}
            />
            <small>{layout.text.lineHeight.toFixed(2)}</small>
          </label>
          <label>
            Paragraph gap
            <input
              type="range"
              min={0}
              max={96}
              step={4}
              value={layout.paragraphGap}
              onChange={(event) => setDebounced('paragraphGap', Number(event.target.value))}
            />
            <small>{paragraphGapLabel}</small>
          </label>
          <label>
            Max lines
            <input
              type="number"
              min={0}
              max={20}
              value={layout.text.maxLines}
              onChange={(event) => setText('maxLines', Number(event.target.value))}
            />
            <small>
              {layout.text.maxLines <= 0 ? 'Unlimited' : `${layout.text.maxLines} lines`}
            </small>
          </label>
          <div>Overflow</div>
          <SegmentGroup
            value={layout.text.overflow}
            onChange={(value) => setText('overflow', value)}
            items={OVERFLOW_OPTIONS.map((value) => ({
              value,
              label: value === 'wrap' ? 'Wrap' : 'Fade',
            }))}
          />
        </div>

        <div className="section" aria-disabled={!showNickname}>
          <div>Nickname</div>
          <div>
            Position
            {HORIZONTAL_OPTIONS.map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="nicknamePosition"
                  value={value}
                  checked={layout.nickname.position === value}
                  onChange={() => setNickname('position', value)}
                  disabled={!showNickname}
                />
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </label>
            ))}
          </div>
          <label>
            Offset
            <input
              type="range"
              min={0}
              max={240}
              step={4}
              value={layout.nickname.offset}
              onChange={(event) => setNicknameDebounced('offset', Number(event.target.value))}
              disabled={!showNickname}
            />
            <small>{nicknameOffsetLabel}</small>
          </label>
          <div>
            Size
            {NICKNAME_SIZES.map((size) => (
              <label key={size}>
                <input
                  type="radio"
                  name="nicknameSize"
                  value={size}
                  checked={layout.nickname.size === size}
                  onChange={() => setNickname('size', size)}
                  disabled={!showNickname}
                />
                {size}
              </label>
            ))}
          </div>
          <label>
            Opacity
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={nicknameOpacityValue}
              onChange={(event) =>
                setNicknameDebounced('opacity', Number(event.target.value) / 100)
              }
              disabled={!showNickname}
            />
            <small>{`${nicknameOpacityValue}%`}</small>
          </label>
        </div>

        <div className="section">
          <div>Text shadow</div>
          {TEXT_SHADOW_OPTIONS.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="layoutTextShadow"
                value={value}
                checked={layout.textShadow === value}
                onChange={() => set('textShadow', value)}
              />
              {value}
            </label>
          ))}
          <label>
            Gradient intensity
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={gradientValue}
              onChange={(event) =>
                setDebounced('gradientIntensity', Number(event.target.value) / 100)
              }
            />
            <small>{`${gradientValue}%`}</small>
          </label>
        </div>
      </div>
      <div className="sheet__footer">
        <button
          className="btn"
          onClick={() => {
            haptic();
            reset();
          }}
          type="button"
        >
          Reset layout
        </button>
        <button
          className="btn-soft"
          onClick={() => {
            haptic();
            onDone();
          }}
          type="button"
        >
          Done
        </button>
      </div>
    </Sheet>
  );
}
