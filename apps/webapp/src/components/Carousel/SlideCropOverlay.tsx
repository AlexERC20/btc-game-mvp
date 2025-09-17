import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { BASE_FRAME } from '@/features/render/constants';
import { createDefaultTransform, type PhotoTransform } from '@/state/store';
import { computeCoverScale } from '@/utils/collage';

const SCALE_MAX = 3;

type Point = { x: number; y: number };

type GestureState =
  | { mode: 'none' }
  | { mode: 'pan'; pointerId: number; start: Point; base: PhotoTransform }
  | {
      mode: 'pinch';
      pointers: [number, number];
      start: { center: Point; distance: number; base: PhotoTransform };
    };

type Props = {
  slot: 'single' | 'top' | 'bottom';
  photoSrc: string;
  box: { x: number; y: number; width: number; height: number };
  transform: PhotoTransform;
  onCancel: () => void;
  onSave: (transform: PhotoTransform) => void;
};

export function SlideCropOverlay({ slot, photoSrc, box, transform, onCancel, onSave }: Props) {
  const transformRef = useRef<PhotoTransform>(transform);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointerPositions = useRef(new Map<number, Point>());
  const gestureRef = useRef<GestureState>({ mode: 'none' });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      ctxRef.current = canvas.getContext('2d');
    }
  }, []);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const baseScale = useMemo(() => {
    if (!imageSize) return 1;
    return computeCoverScale(imageSize.width, imageSize.height, box.width, box.height);
  }, [box.height, box.width, imageSize]);

  const clampScale = useCallback((value: number) => {
    if (Number.isNaN(value)) return 1;
    return Math.min(Math.max(value, 1), SCALE_MAX);
  }, []);

  const clampTransform = useCallback(
    (value: PhotoTransform): PhotoTransform => {
      const scale = clampScale(value.scale);
      if (!imageSize) {
        return { scale, offsetX: value.offsetX, offsetY: value.offsetY };
      }
      const drawWidth = imageSize.width * baseScale * scale;
      const drawHeight = imageSize.height * baseScale * scale;
      const maxOffsetX = Math.max(0, (drawWidth - box.width) / 2);
      const maxOffsetY = Math.max(0, (drawHeight - box.height) / 2);
      return {
        scale,
        offsetX: Math.min(Math.max(value.offsetX, -maxOffsetX), maxOffsetX),
        offsetY: Math.min(Math.max(value.offsetY, -maxOffsetY), maxOffsetY),
      };
    },
    [baseScale, box.height, box.width, clampScale, imageSize],
  );

  const render = useCallback(() => {
    const ctx = ctxRef.current;
    const img = imageRef.current;
    if (!ctx || !img || !imageSize) return;
    ctx.clearRect(0, 0, box.width, box.height);
    const { scale, offsetX, offsetY } = transformRef.current;
    const absoluteScale = baseScale * scale;
    const drawWidth = imageSize.width * absoluteScale;
    const drawHeight = imageSize.height * absoluteScale;
    const dx = (box.width - drawWidth) / 2 + offsetX;
    const dy = (box.height - drawHeight) / 2 + offsetY;
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  }, [baseScale, box.height, box.width, imageSize]);

  const applyTransform = useCallback(
    (value: PhotoTransform) => {
      const next = clampTransform(value);
      transformRef.current = next;
      render();
    },
    [clampTransform, render],
  );

  useEffect(() => {
    if (imageSize) {
      applyTransform(transformRef.current);
    }
  }, [applyTransform, imageSize]);

  useEffect(() => {
    let alive = true;
    setImageSize(null);
    imageRef.current = null;
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.src = photoSrc;

    const waitForDecode = async () => {
      if (typeof img.decode === 'function') {
        try {
          await img.decode();
          return;
        } catch {
          // fall through to load events
        }
      }
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    };

    (async () => {
      try {
        await waitForDecode();
        if (!alive) return;
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        imageRef.current = img;
        if (width && height) {
          setImageSize({ width, height });
        }
        render();
      } catch (error) {
        console.error('Failed to decode crop image', error);
      }
    })();

    return () => {
      alive = false;
    };
  }, [photoSrc, render]);

  const getLocalPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const area = areaRef.current;
      if (!area) return null;
      const rect = area.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const scaleX = rect.width / box.width;
      const scaleY = rect.height / box.height;
      if (!scaleX || !scaleY) return null;
      return {
        x: (clientX - rect.left) / scaleX,
        y: (clientY - rect.top) / scaleY,
      };
    },
    [box.height, box.width],
  );

  const resetGesture = useCallback(() => {
    pointerPositions.current.clear();
    gestureRef.current = { mode: 'none' };
  }, []);

  const applyPan = useCallback(
    (base: PhotoTransform, delta: Point) => {
      applyTransform({
        scale: base.scale,
        offsetX: base.offsetX + delta.x,
        offsetY: base.offsetY + delta.y,
      });
    },
    [applyTransform],
  );

  const applyScaleFromBase = useCallback(
    (base: PhotoTransform, targetScale: number, baseCenter: Point, nextCenter: Point) => {
      const scale = clampScale(targetScale);
      if (!imageSize) {
        applyTransform({ ...base, scale });
        return;
      }
      const baseAbsScale = baseScale * base.scale;
      const newAbsScale = baseScale * scale;
      const baseDrawWidth = imageSize.width * baseAbsScale;
      const baseDrawHeight = imageSize.height * baseAbsScale;
      const baseLeft = (box.width - baseDrawWidth) / 2 + base.offsetX;
      const baseTop = (box.height - baseDrawHeight) / 2 + base.offsetY;
      const imgX = (baseCenter.x - baseLeft) / baseAbsScale;
      const imgY = (baseCenter.y - baseTop) / baseAbsScale;
      const drawWidth = imageSize.width * newAbsScale;
      const drawHeight = imageSize.height * newAbsScale;
      const newLeft = nextCenter.x - imgX * newAbsScale;
      const newTop = nextCenter.y - imgY * newAbsScale;
      const offsetX = newLeft - (box.width - drawWidth) / 2;
      const offsetY = newTop - (box.height - drawHeight) / 2;
      applyTransform({ scale, offsetX, offsetY });
    },
    [applyTransform, baseScale, box.height, box.width, clampScale, imageSize],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const local = getLocalPoint(event.clientX, event.clientY);
      if (!local) return;
      areaRef.current?.setPointerCapture(event.pointerId);
      pointerPositions.current.set(event.pointerId, local);

      if (pointerPositions.current.size === 1) {
        gestureRef.current = {
          mode: 'pan',
          pointerId: event.pointerId,
          start: local,
          base: { ...transformRef.current },
        };
      } else if (pointerPositions.current.size === 2) {
        const entries = Array.from(pointerPositions.current.entries());
        const [a, b] = entries;
        const center: Point = {
          x: (a[1].x + b[1].x) / 2,
          y: (a[1].y + b[1].y) / 2,
        };
        const distance = Math.hypot(a[1].x - b[1].x, a[1].y - b[1].y);
        gestureRef.current = {
          mode: 'pinch',
          pointers: [a[0], b[0]],
          start: { center, distance, base: { ...transformRef.current } },
        };
      }
    },
    [getLocalPoint],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const entry = pointerPositions.current.get(event.pointerId);
      const local = getLocalPoint(event.clientX, event.clientY);
      if (!entry || !local) return;
      pointerPositions.current.set(event.pointerId, local);

      const gesture = gestureRef.current;
      if (gesture.mode === 'pan' && gesture.pointerId === event.pointerId) {
        const delta = {
          x: local.x - gesture.start.x,
          y: local.y - gesture.start.y,
        };
        applyPan(gesture.base, delta);
      } else if (gesture.mode === 'pinch') {
        const [idA, idB] = gesture.pointers;
        const posA = pointerPositions.current.get(idA);
        const posB = pointerPositions.current.get(idB);
        if (!posA || !posB) return;
        const center: Point = {
          x: (posA.x + posB.x) / 2,
          y: (posA.y + posB.y) / 2,
        };
        const distance = Math.hypot(posA.x - posB.x, posA.y - posB.y);
        const factor = gesture.start.distance ? distance / gesture.start.distance : 1;
        const targetScale = gesture.start.base.scale * factor;
        applyScaleFromBase(gesture.start.base, targetScale, gesture.start.center, center);
      }
    },
    [applyPan, applyScaleFromBase, getLocalPoint],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointerPositions.current.delete(event.pointerId);
    if (gestureRef.current.mode === 'pan' && gestureRef.current.pointerId === event.pointerId) {
      gestureRef.current = { mode: 'none' };
    } else if (gestureRef.current.mode === 'pinch') {
      const remaining = Array.from(pointerPositions.current.keys());
      if (remaining.length === 1) {
        const id = remaining[0];
        const point = pointerPositions.current.get(id);
        if (point) {
          gestureRef.current = {
            mode: 'pan',
            pointerId: id,
            start: point,
            base: { ...transformRef.current },
          };
        } else {
          gestureRef.current = { mode: 'none' };
        }
      } else if (remaining.length < 1) {
        gestureRef.current = { mode: 'none' };
      }
    }
    areaRef.current?.releasePointerCapture?.(event.pointerId);
  }, []);

  const handlePointerCancel = useCallback(() => {
    resetGesture();
  }, [resetGesture]);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const local = getLocalPoint(event.clientX, event.clientY);
      if (!local) return;
      const base = transformRef.current;
      const delta = -event.deltaY / 400;
      if (!delta) return;
      const targetScale = base.scale * (1 + delta);
      applyScaleFromBase(base, targetScale, local, local);
    },
    [applyScaleFromBase, getLocalPoint],
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const local = getLocalPoint(event.clientX, event.clientY);
      if (!local) return;
      const base = transformRef.current;
      const targetScale = Math.min(base.scale * 1.25, SCALE_MAX);
      applyScaleFromBase(base, targetScale, local, local);
    },
    [applyScaleFromBase, getLocalPoint],
  );

  const handleMaskPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      resetGesture();
      onCancel();
    },
    [onCancel, resetGesture],
  );

  const handleReset = useCallback(() => {
    applyTransform(createDefaultTransform());
  }, [applyTransform]);

  const handleSaveClick = useCallback(() => {
    onSave(transformRef.current);
    resetGesture();
  }, [onSave, resetGesture]);

  const maskSegments = useMemo(() => {
    const segments: { key: string; style: React.CSSProperties }[] = [];
    if (box.y > 0) {
      segments.push({
        key: 'top',
        style: { left: 0, top: 0, width: BASE_FRAME.width, height: box.y },
      });
    }
    const bottomY = box.y + box.height;
    if (bottomY < BASE_FRAME.height) {
      segments.push({
        key: 'bottom',
        style: {
          left: 0,
          top: bottomY,
          width: BASE_FRAME.width,
          height: BASE_FRAME.height - bottomY,
        },
      });
    }
    if (box.x > 0) {
      segments.push({
        key: 'left',
        style: { left: 0, top: box.y, width: box.x, height: box.height },
      });
    }
    const rightX = box.x + box.width;
    if (rightX < BASE_FRAME.width) {
      segments.push({
        key: 'right',
        style: {
          left: rightX,
          top: box.y,
          width: BASE_FRAME.width - rightX,
          height: box.height,
        },
      });
    }
    return segments;
  }, [box.height, box.width, box.x, box.y]);

  return (
    <div className="slide-crop-overlay" data-slot={slot}>
      <div className="slide-crop-overlay__mask" onPointerDown={handleMaskPointerDown}>
        {maskSegments.map((segment) => (
          <div key={segment.key} className="slide-crop-overlay__shade" style={segment.style} />
        ))}
      </div>
      <div
        ref={areaRef}
        className="slide-crop-overlay__surface"
        style={{
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <canvas ref={canvasRef} width={box.width} height={box.height} />
        <div className="slide-crop-overlay__grid" />
      </div>
      <div className="slide-crop-overlay__toolbar">
        <button type="button" className="btn-soft" onClick={() => { resetGesture(); onCancel(); }}>
          Cancel
        </button>
        <button type="button" className="btn-soft" onClick={handleReset}>
          Reset
        </button>
        <button type="button" className="btn-soft is-active" onClick={handleSaveClick}>
          Save
        </button>
      </div>
    </div>
  );
}
