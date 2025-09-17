import { useMemo } from 'react';
import Sheet from '../Sheet/Sheet';
import {
  useCarouselStore,
  createDefaultCollage50,
  normalizeCollage,
  createDefaultTransform,
  usePhotos,
} from '@/state/store';
import type { Collage50, TemplateStyle, Slide } from '@/state/store';
import { resolvePhotoFromStore } from '@/utils/photos';
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

const DIVIDER_COLOR_PRESETS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#000000', label: 'Black' },
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
  const activeSlide = useCarouselStore((s) => s.slides[s.activeIndex]);
  const updateSlide = useCarouselStore((s) => s.updateSlide);
  const applyCollageTemplateToAll = useCarouselStore((s) => s.applyCollageTemplateToAll);

  const collageConfig = useMemo(
    () => normalizeCollage(activeSlide?.collage50),
    [activeSlide?.collage50],
  );
  const isCollageTemplate = activeSlide?.template === 'collage-50';

  const updateCollage = (patch: Partial<Collage50>) => {
    if (!activeSlide) return;
    const next = { ...collageConfig, ...patch };
    updateSlide(activeSlide.id, { collage50: next });
  };

  const selectSingle = () => {
    if (!activeSlide) return;
    if (activeSlide.template === 'single') return;
    const snapshot = normalizeCollage(activeSlide.collage50);
    const topRef = snapshot.top.photoId;
    const fallbackImage = topRef ? resolvePhotoFromStore(topRef) : undefined;
    const photosState = usePhotos.getState();
    const isLibraryPhoto = topRef ? photosState.items.some((p) => p.id === topRef) : false;
    const patch: Partial<Slide> = {
      template: 'single',
      image: fallbackImage ?? activeSlide.image,
    };
    if (isLibraryPhoto && topRef) {
      patch.photoId = topRef;
    }
    updateSlide(activeSlide.id, patch);
  };

  const selectCollage = () => {
    if (!activeSlide) return;
    const base = createDefaultCollage50();
    const previous = normalizeCollage(activeSlide.collage50);
    const next = {
      ...base,
      dividerPx: previous.dividerPx,
      dividerColor: previous.dividerColor,
      dividerOpacity: previous.dividerOpacity,
      top: { ...previous.top },
      bottom: { ...previous.bottom },
    };
    if (!next.top.photoId) {
      if (activeSlide.photoId) next.top = { photoId: activeSlide.photoId, transform: createDefaultTransform() };
      else if (activeSlide.image) next.top = { photoId: activeSlide.image, transform: createDefaultTransform() };
    }
    updateSlide(activeSlide.id, { template: 'collage-50', collage50: next, image: undefined, photoId: undefined });
  };

  const isDividerPresetActive = (value: string) => {
    const current = (collageConfig.dividerColor ?? '').toLowerCase();
    if (value === 'auto') return current === 'auto';
    if (value === '#FFFFFF') return current === '#ffffff' || current === '#fff';
    if (value === '#000000') return current === '#000000' || current === '#000';
    return current === value.toLowerCase();
  };

  const onDone = () => {
    apply();
    close();
  };

  return (
    <Sheet title="Template">
      <div className="template-sheet">
        <div className="section">
          <div className="title">Slide layout</div>
          <div className="template-sheet__quick-row">
            <button
              type="button"
              className={`${SOFT_CLASSES}${!isCollageTemplate ? ' is-active' : ''}`}
              onClick={selectSingle}
            >
              Single photo
            </button>
            <button
              type="button"
              className={`${SOFT_CLASSES}${isCollageTemplate ? ' is-active' : ''}`}
              onClick={selectCollage}
            >
              Collage 50/50
            </button>
          </div>
          {isCollageTemplate && (
            <div className="collage-controls">
              <div className="slider-row">
                <label>
                  Толщина линии
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={collageConfig.dividerPx}
                    onChange={(e) => updateCollage({ dividerPx: Number(e.target.value) })}
                  />
                </label>
                <div className="value">{collageConfig.dividerPx}px</div>
              </div>
              <div className="slider-row">
                <label>
                  Прозрачность
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={collageConfig.dividerOpacity}
                    onChange={(e) => updateCollage({ dividerOpacity: Number(e.target.value) })}
                  />
                </label>
                <div className="value">{collageConfig.dividerOpacity.toFixed(2)}</div>
              </div>
              <div className="segmented">
                {DIVIDER_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`${SOFT_CLASSES}${isDividerPresetActive(preset.value) ? ' is-active' : ''}`}
                    onClick={() => updateCollage({ dividerColor: preset.value })}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-soft"
                onClick={applyCollageTemplateToAll}
              >
                Apply template to all slides
              </button>
            </div>
          )}
        </div>
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

