import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import type { CropSlot, PhotoTransform } from '@/state/store';
import { useCropGestures } from '@/utils/cropGestures';
import { getCollageBoxes } from '@/utils/getCollageBoxes';
import { placeImage } from '@/utils/placeImage';

const MIN_SCALE = 1;
const PAN_EPSILON = 0.5;
const SCALE_EPSILON = 1e-4;

type Box = { x: number; y: number; w: number; h: number };

type FrameSize = { width: number; height: number };

type Props = {
  slot: CropSlot;
  photoSrc: string;
  transform: PhotoTransform;
  frame: FrameSize;
  dividerPx?: number;
  onCancel: () => void;
  onSave: (slot: CropSlot, transform: PhotoTransform) => void;
};

type DimRegion = Box;

type BoxConfig = { active: Box; dims: DimRegion[] };

function resolveBoxes(slot: CropSlot, frame: FrameSize, dividerPx = 0): BoxConfig {
  const full: Box = { x: 0, y: 0, w: frame.width, h: frame.height };
  if (slot === 'single') {
    return { active: full, dims: [] };
  }

  const safeDivider = Math.min(Math.max(0, dividerPx), frame.height);
  const { top, bot } = getCollageBoxes(frame.width, frame.height, safeDivider);
  const divider: DimRegion | null = safeDivider > 0 ? { x: 0, y: top.h, w: frame.width, h: safeDivider } : null;

  const normalize = (region: DimRegion | null) =>
    region && region.w > 0 && region.h > 0 ? region : null;

  if (slot === 'top') {
    return {
      active: top,
      dims: [normalize(bot), normalize(divider)].filter((v): v is DimRegion => Boolean(v)),
    };
  }

  return {
    active: bot,
    dims: [normalize(top), normalize(divider)].filter((v): v is DimRegion => Boolean(v)),
  };
}

function applyTransform(element: HTMLImageElement | null, state: { scale: number; x: number; y: number }) {
  if (!element) return;
  element.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
}

function clampToBox(
  state: { scale: number; x: number; y: number },
  box: Box,
  imgWidth: number,
  imgHeight: number,
  minScale: number,
) {
  const baseScale = Math.max(box.w / imgWidth, box.h / imgHeight);
  const effective = baseScale * state.scale;
  const maxOffsetX = Math.max(0, (imgWidth * effective - box.w) / 2);
  const maxOffsetY = Math.max(0, (imgHeight * effective - box.h) / 2);
  state.x = Math.min(maxOffsetX, Math.max(-maxOffsetX, state.x));
  state.y = Math.min(maxOffsetY, Math.max(-maxOffsetY, state.y));
  if (state.scale <= minScale + SCALE_EPSILON && (Math.abs(state.x) > PAN_EPSILON || Math.abs(state.y) > PAN_EPSILON)) {
    state.scale = minScale * 1.02;
  }
}

export function CropOverlay({ slot, photoSrc, transform, frame, dividerPx = 0, onCancel, onSave }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const { active: box, dims } = useMemo(() => resolveBoxes(slot, frame, dividerPx), [dividerPx, frame, slot]);

  const gestures = useCropGestures({
    frameRef,
    imgRef: imageRef,
    minScale: MIN_SCALE,
    initial: {
      scale: transform.scale ?? MIN_SCALE,
      offsetX: transform.offsetX ?? 0,
      offsetY: transform.offsetY ?? 0,
    },
  });

  useEffect(() => {
    const state = gestures.current;
    state.scale = Math.max(transform.scale ?? MIN_SCALE, MIN_SCALE);
    state.x = transform.offsetX ?? 0;
    state.y = transform.offsetY ?? 0;
    state.pts.clear();
    state.pinchDistance = 0;
    applyTransform(imageRef.current, state);
  }, [gestures, transform.offsetX, transform.offsetY, transform.scale]);

  useEffect(() => {
    setNaturalSize(null);
  }, [photoSrc]);

  const handleImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return;
    setNaturalSize({ width, height });
  }, []);

  useEffect(() => {
    const img = imageRef.current;
    if (!img || !naturalSize) return;

    const placement = placeImage(box, naturalSize.width, naturalSize.height);
    img.style.position = 'absolute';
    img.style.left = `${placement.left - box.x}px`;
    img.style.top = `${placement.top - box.y}px`;
    img.style.width = `${placement.width}px`;
    img.style.height = `${placement.height}px`;
    img.style.transformOrigin = 'center center';
    img.style.willChange = 'transform';
    img.draggable = false;

    applyTransform(img, gestures.current);
  }, [box, gestures, naturalSize]);

  const ready = Boolean(naturalSize);

  const handleReset = useCallback(() => {
    const state = gestures.current;
    state.scale = MIN_SCALE;
    state.x = 0;
    state.y = 0;
    applyTransform(imageRef.current, state);
  }, [gestures]);

  const handleSave = useCallback(() => {
    if (!naturalSize) return;
    const state = gestures.current;
    clampToBox(state, box, naturalSize.width, naturalSize.height, MIN_SCALE);
    applyTransform(imageRef.current, state);
    onSave(slot, { scale: state.scale, offsetX: state.x, offsetY: state.y });
  }, [box, gestures, naturalSize, onSave, slot]);

  const frameStyle = useMemo(() => ({ left: box.x, top: box.y, width: box.w, height: box.h }), [box]);

  return (
    <div className="crop-layer">
      {dims.map((region) => (
        <div
          key={`${region.x}-${region.y}-${region.w}-${region.h}`}
          className="dim-other"
          style={{ left: region.x, top: region.y, width: region.w, height: region.h }}
        />
      ))}
      <div className="crop-frame" ref={frameRef} style={frameStyle}>
        <img
          ref={imageRef}
          className="crop-img"
          src={photoSrc}
          alt=""
          draggable={false}
          onLoad={handleImageLoad}
        />
        <div className="crop-grid" />
      </div>
      <div className="crop-toolbar">
        <button type="button" className="crop-button" onClick={handleReset} disabled={!ready}>
          Reset
        </button>
        <div className="crop-toolbar__actions">
          <button type="button" className="crop-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="crop-button is-primary" onClick={handleSave} disabled={!ready}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
