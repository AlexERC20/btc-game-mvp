import { useMemo } from 'react';
import Sheet from '../Sheet/Sheet';
import {
  LayoutConfig,
  useCarouselStore,
  useLayoutSelector,
  useLayoutStore,
} from '@/state/store';
import { debounce } from '@/utils/debounce';
import '@/styles/photos-sheet.css';

const VERTICAL_OPTIONS: LayoutConfig['vertical'][] = ['top', 'middle', 'bottom'];
const HORIZONTAL_OPTIONS: LayoutConfig['horizontal'][] = ['left', 'center', 'right'];
const OVERFLOW_OPTIONS: LayoutConfig['overflow'][] = ['wrap', 'fade'];
const NICKNAME_SIZES: LayoutConfig['nickname']['size'][] = ['S', 'M', 'L'];
const TEXT_SHADOW_OPTIONS: LayoutConfig['textShadow'][] = [0, 1, 2, 3];

function formatPx(value: number) {
  return `${Math.round(value)}px`;
}

export default function LayoutSheet() {
  const layout = useLayoutSelector((state) => ({
    vertical: state.vertical,
    vOffset: state.vOffset,
    horizontal: state.horizontal,
    useSafeArea: state.useSafeArea,
    blockWidth: state.blockWidth,
    padding: state.padding,
    maxLines: state.maxLines,
    overflow: state.overflow,
    paragraphGap: state.paragraphGap,
    cornerRadius: state.cornerRadius,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    nickname: state.nickname,
    textShadow: state.textShadow,
    gradientIntensity: state.gradientIntensity,
  }));
  const set = useLayoutStore((state) => state.set);
  const setNickname = useLayoutStore((state) => state.setNickname);
  const reset = useLayoutStore((state) => state.reset);
  const close = useCarouselStore((s) => s.closeSheet);
  const showNickname = useCarouselStore((s) => s.style.template.showNickname);

  const setDebounced = useMemo(() => debounce(set, 16), [set]);
  const setNicknameDebounced = useMemo(() => debounce(setNickname, 16), [setNickname]);

  const blockWidthLabel = layout.blockWidth <= 0 ? 'Auto' : formatPx(layout.blockWidth);
  const paddingLabel = formatPx(layout.padding);
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
          {VERTICAL_OPTIONS.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="layoutVertical"
                value={value}
                checked={layout.vertical === value}
                onChange={() => set('vertical', value)}
              />
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </label>
          ))}
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
          {HORIZONTAL_OPTIONS.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="layoutHorizontal"
                value={value}
                checked={layout.horizontal === value}
                onChange={() => set('horizontal', value)}
              />
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={layout.useSafeArea}
              onChange={(event) => set('useSafeArea', event.target.checked)}
            />
            Safe area guides
          </label>
        </div>

        <div className="section">
          <label>
            Block width
            <input
              type="range"
              min={0}
              max={1080}
              step={10}
              value={layout.blockWidth}
              onChange={(event) => setDebounced('blockWidth', Number(event.target.value))}
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
              value={layout.padding}
              onChange={(event) => setDebounced('padding', Number(event.target.value))}
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
              value={layout.lineHeight}
              onChange={(event) => setDebounced('lineHeight', Number(event.target.value))}
            />
            <small>{layout.lineHeight.toFixed(2)}</small>
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
              value={layout.maxLines}
              onChange={(event) => set('maxLines', Number(event.target.value))}
            />
            <small>{layout.maxLines <= 0 ? 'Unlimited' : `${layout.maxLines} lines`}</small>
          </label>
          <div>Overflow</div>
          {OVERFLOW_OPTIONS.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="layoutOverflow"
                value={value}
                checked={layout.overflow === value}
                onChange={() => set('overflow', value)}
              />
              {value === 'wrap' ? 'Wrap' : 'Fade'}
            </label>
          ))}
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
              onChange={(event) =>
                setNicknameDebounced('offset', Number(event.target.value))
              }
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
        <button className="btn" onClick={reset} type="button">
          Reset layout
        </button>
        <button className="btn-soft" onClick={onDone} type="button">
          Done
        </button>
      </div>
    </Sheet>
  );
}
