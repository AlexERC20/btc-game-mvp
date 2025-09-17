import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import type { PhotoTransform } from '@/state/store';
import { createDefaultTransform } from '@/state/store';
import type { CollageBox } from '@/utils/collage';

type Point = { x: number; y: number };

const SCALE_MAX = 3;

type Props = {
  open: boolean;
  slot: 'top' | 'bottom';
  photoSrc: string;
  transform: PhotoTransform;
  box: CollageBox;
  onClose: () => void;
  onSave: (transform: PhotoTransform) => void;
};

type GestureState =
  | { mode: 'none' }
  | { mode: 'pan'; pointerId: number; start: Point; base: PhotoTransform }
  | {
      mode: 'pinch';
      pointers: [number, number];
      start: { center: Point; distance: number; base: PhotoTransform };
    };

export function CollageCropModal({
  open,
  slot,
  photoSrc,
  transform,
  box,
  onClose,
  onSave,
}: Props) {
  const [current, setCurrent] = useState<PhotoTransform>(transform);
  const transformRef = useRef(transform);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointerPositions = useRef(
    new Map<number, { start: Point; point: Point }>(),
  );
  const gestureRef = useRef<GestureState>({ mode: 'none' });
  const [surfaceScale, setSurfaceScale] = useState(1);

  useEffect(() => {
    if (open) {
      setCurrent(transform);
      transformRef.current = transform;
      render();
    }
  }, [open, render, transform]);

  useEffect(() => {
    setImageSize(null);
    imageRef.current = null;
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.clearRect(0, 0, box.width, box.height);
    }
  }, [box.height, box.width, photoSrc]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const element = wrapperRef.current;
    if (!element) return;
    const updateScale = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scale = Math.min(rect.width / box.width, rect.height / box.height);
      setSurfaceScale(scale > 0 ? scale : 1);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [open, box.width, box.height]);

  const baseScale = useMemo(() => {
    if (!imageSize) return 1;
    return Math.max(box.width / imageSize.width, box.height / imageSize.height);
  }, [imageSize, box.width, box.height]);

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

  const clampScale = useCallback((value: number) => {
    if (Number.isNaN(value)) return 1;
    return Math.min(Math.max(value, 1), SCALE_MAX);
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photoSrc;

    const decode = 'decode' in img ? img.decode() : undefined;
    const loadPromise =
      decode instanceof Promise
        ? decode
        : new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (error) => reject(error);
          });

    (async () => {
      try {
        await loadPromise;
        if (!alive) return;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (!alive) return;
        imageRef.current = img;
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (width && height) {
          setImageSize({ width, height });
        }
        render();
      } catch (error) {
        console.error('Failed to load image for crop', error);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, photoSrc, render]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = box.width * dpr;
    canvas.height = box.height * dpr;
    canvas.style.width = `${box.width}px`;
    canvas.style.height = `${box.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    render();
  }, [box.height, box.width, open, render]);

  const clampTransform = useCallback(
    (value: PhotoTransform): PhotoTransform => {
      if (!imageSize) {
        return {
          scale: clampScale(value.scale),
          offsetX: value.offsetX,
          offsetY: value.offsetY,
        };
      }
      const scale = clampScale(value.scale);
      const drawWidth = imageSize.width * baseScale * scale;
      const drawHeight = imageSize.height * baseScale * scale;
      const minX = box.width - drawWidth;
      const minY = box.height - drawHeight;
      return {
        scale,
        offsetX: Math.min(Math.max(value.offsetX, minX), 0),
        offsetY: Math.min(Math.max(value.offsetY, minY), 0),
      };
    },
    [baseScale, box.height, box.width, clampScale, imageSize],
  );

  useEffect(() => {
    if (!open) return;
    render();
  }, [open, render]);

  const applyTransform = useCallback(
    (value: PhotoTransform) => {
      const next = clampTransform(value);
      setCurrent(next);
      transformRef.current = next;
      render();
    },
    [clampTransform, render],
  );

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

  const resetGesture = useCallback(() => {
    pointerPositions.current.clear();
    gestureRef.current = { mode: 'none' };
  }, []);

  const getLocalPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const surface = surfaceRef.current;
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return {
        x: (clientX - rect.left) / surfaceScale,
        y: (clientY - rect.top) / surfaceScale,
      };
    },
    [surfaceScale],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!open) return;
      const local = getLocalPoint(event.clientX, event.clientY);
      if (!local) return;
      surfaceRef.current?.setPointerCapture(event.pointerId);
      pointerPositions.current.set(event.pointerId, { start: local, point: local });

      if (pointerPositions.current.size === 1) {
        gestureRef.current = {
          mode: 'pan',
          pointerId: event.pointerId,
          start: local,
          base: transformRef.current,
        };
      } else if (pointerPositions.current.size === 2) {
        const entries = Array.from(pointerPositions.current.entries());
        const [a, b] = entries;
        const center: Point = {
          x: (a[1].point.x + b[1].point.x) / 2,
          y: (a[1].point.y + b[1].point.y) / 2,
        };
        const distance = Math.hypot(
          a[1].point.x - b[1].point.x,
          a[1].point.y - b[1].point.y,
        );
        gestureRef.current = {
          mode: 'pinch',
          pointers: [a[0], b[0]],
          start: { center, distance, base: transformRef.current },
        };
      }
    },
    [getLocalPoint, open],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (gestureRef.current.mode === 'none') return;
      const entry = pointerPositions.current.get(event.pointerId);
      const local = getLocalPoint(event.clientX, event.clientY);
      if (!entry || !local) return;
      entry.point = local;

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
          x: (posA.point.x + posB.point.x) / 2,
          y: (posA.point.y + posB.point.y) / 2,
        };
        const distance = Math.hypot(
          posA.point.x - posB.point.x,
          posA.point.y - posB.point.y,
        );
        const factor = gesture.start.distance
          ? distance / gesture.start.distance
          : 1;
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
        const entry = pointerPositions.current.get(id);
        if (entry) {
          gestureRef.current = {
            mode: 'pan',
            pointerId: id,
            start: entry.point,
            base: transformRef.current,
          };
        } else {
          gestureRef.current = { mode: 'none' };
        }
      } else if (remaining.length < 1) {
        gestureRef.current = { mode: 'none' };
      }
    }
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

  if (!open) return null;

  const slotLabel = slot === 'top' ? 'Верхний слот' : 'Нижний слот';

  return (
    <div className="crop-modal">
      <div
        className="crop-modal__overlay"
        onClick={() => {
          onClose();
          resetGesture();
        }}
      />
      <div className="crop-modal__panel" role="dialog" aria-modal="true">
        <div className="crop-modal__header">
          <h3>Кадрирование — {slotLabel}</h3>
          <button
            type="button"
            onClick={() => {
              onClose();
              resetGesture();
            }}
            aria-label="Close"
            className="crop-modal__close"
          >
            ×
          </button>
        </div>
        <div className="crop-modal__content">
          <div className="crop-modal__canvas" ref={wrapperRef}>
            <div
              ref={surfaceRef}
              className="crop-modal__surface"
              style={{
                width: box.width,
                height: box.height,
                transform: `translate(-50%, -50%) scale(${surfaceScale})`,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
            >
              <canvas ref={canvasRef} width={box.width} height={box.height} />
            </div>
          </div>
          <div className="crop-modal__controls">
            <button
              type="button"
              className="btn-soft"
              onClick={() => {
                applyTransform(createDefaultTransform());
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <div className="crop-modal__footer">
          <button
            type="button"
            className="btn-soft"
            onClick={() => {
              onClose();
              resetGesture();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-soft is-active"
            onClick={() => {
              onSave(current);
              resetGesture();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
