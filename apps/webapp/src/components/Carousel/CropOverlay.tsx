import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import type { CropSlot, PhotoTransform } from '@/state/store';
import { clampValue, useCropGestures, type CropTransform } from '@/utils/cropGestures';

const MAX_RELATIVE_SCALE = 3;

type Box = { x: number; y: number; width: number; height: number };

type Props = {
  slot: CropSlot;
  box: Box;
  photoSrc: string;
  transform: PhotoTransform;
  onCancel: () => void;
  onSave: (slot: CropSlot, transform: PhotoTransform) => void;
};

type Size = { width: number; height: number };

export function CropOverlay({ slot, box, photoSrc, transform, onCancel, onSave }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const baseScaleRef = useRef(1);

  const clampTransform = useCallback(
    (value: CropTransform): CropTransform => {
      const minScale = baseScaleRef.current;
      const maxScale = minScale * MAX_RELATIVE_SCALE;
      const scale = clampValue(value.scale, minScale, maxScale);
      if (!imageSize) {
        return { scale, offsetX: value.offsetX, offsetY: value.offsetY };
      }
      const drawWidth = imageSize.width * scale;
      const drawHeight = imageSize.height * scale;
      const maxOffsetX = Math.max(0, (drawWidth - box.width) / 2);
      const maxOffsetY = Math.max(0, (drawHeight - box.height) / 2);
      return {
        scale,
        offsetX: clampValue(value.offsetX, -maxOffsetX, maxOffsetX),
        offsetY: clampValue(value.offsetY, -maxOffsetY, maxOffsetY),
      };
    },
    [box.height, box.width, imageSize],
  );

  const gestures = useCropGestures({
    boxRef: frameRef,
    imgRef: imageRef,
    initial: clampTransform({
      scale: baseScaleRef.current,
      offsetX: transform.offsetX ?? 0,
      offsetY: transform.offsetY ?? 0,
    }),
    clamp: clampTransform,
  });

  const frameStyle = useMemo(
    () => ({
      left: `${box.x}px`,
      top: `${box.y}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    }),
    [box.height, box.width, box.x, box.y],
  );

  const handleImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return;
    setImageSize({ width, height });
  }, []);

  useEffect(() => {
    setImageSize(null);
  }, [photoSrc]);

  useEffect(() => {
    if (!imageSize) return;
    const baseScale = Math.max(box.width / imageSize.width, box.height / imageSize.height) || 1;
    baseScaleRef.current = baseScale;
    const img = imageRef.current;
    if (img) {
      img.style.position = 'absolute';
      img.style.left = `${(box.width - imageSize.width) / 2}px`;
      img.style.top = `${(box.height - imageSize.height) / 2}px`;
      img.style.width = `${imageSize.width}px`;
      img.style.height = `${imageSize.height}px`;
      img.style.transformOrigin = 'center center';
      img.style.willChange = 'transform';
    }
    const initial = clampTransform({
      scale: baseScale * (transform.scale ?? 1),
      offsetX: transform.offsetX ?? 0,
      offsetY: transform.offsetY ?? 0,
    });
    gestures.setTransform(initial);
  }, [box.height, box.width, clampTransform, gestures, imageSize, transform.offsetX, transform.offsetY, transform.scale]);

  const ready = Boolean(imageSize);

  const handleReset = useCallback(() => {
    const baseScale = baseScaleRef.current;
    gestures.setTransform(
      clampTransform({
        scale: baseScale,
        offsetX: 0,
        offsetY: 0,
      }),
    );
  }, [clampTransform, gestures]);

  const handleSave = useCallback(() => {
    const current = gestures.getTransform();
    const baseScale = baseScaleRef.current || 1;
    const payload: PhotoTransform = {
      scale: current.scale / baseScale,
      offsetX: current.offsetX,
      offsetY: current.offsetY,
    };
    onSave(slot, payload);
  }, [gestures, onSave, slot]);

  return (
    <div className="crop-layer">
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
