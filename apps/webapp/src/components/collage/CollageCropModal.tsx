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
import { computeCoverScale, type CollageBox } from '@/utils/collage';

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
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const viewportRef = useRef<{ width: number; height: number }>({ width: box.width, height: box.height });
  const [viewportVersion, setViewportVersion] = useState(0);
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
    const { width, height } = viewportRef.current;
    if (ctx && width && height) {
      ctx.clearRect(0, 0, width, height);
    }
    viewportRef.current = { width: box.width, height: box.height };
    setViewportVersion((prev) => prev + 1);
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
    const { width, height } = viewportRef.current;
    if (!width || !height) return 1;
    return computeCoverScale(imageSize.width, imageSize.height, width, height);
  }, [imageSize, viewportVersion]);

  const render = useCallback(() => {
    const ctx = ctxRef.current;
    const img = imageRef.current;
    const { width: canvasWidth, height: canvasHeight } = viewportRef.current;
    if (!ctx || !img || !imageSize || !canvasWidth || !canvasHeight) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const { scale, offsetX, offsetY } = transformRef.current;
    const absoluteScale = baseScale * scale;
    const drawWidth = imageSize.width * absoluteScale;
    const drawHeight = imageSize.height * absoluteScale;
    const dx = (canvasWidth - drawWidth) / 2 + offsetX;
    const dy = (canvasHeight - drawHeight) / 2 + offsetY;
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  }, [baseScale, imageSize]);

  const clampScale = useCallback((value: number) => {
    if (Number.isNaN(value)) return 1;
    return Math.min(Math.max(value, 1), SCALE_MAX);
  }, []);

  useEffect(() => {
    if (!open || !photoSrc) return;
    let alive = true;
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
          // fall through to load events below
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
        imageRef.current = img;
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
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
  }, [open, photoSrc, render]);

  const ensureCanvasSize = useCallback(() => {
    if (!open) return;
    const surface = areaRef.current;
    const canvas = canvasRef.current;
    if (!surface || !canvas) return;

    const measure = () => {
      const rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        requestAnimationFrame(measure);
        return;
      }
      const scale = surfaceScale || 1;
      const cssWidth = rect.width / scale;
      const cssHeight = rect.height / scale;
      if (!cssWidth || !cssHeight) {
        requestAnimationFrame(measure);
        return;
      }
      const safeWidth = Math.max(1, cssWidth);
      const safeHeight = Math.max(1, cssHeight);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(safeWidth * dpr));
      canvas.height = Math.max(1, Math.round(safeHeight * dpr));
      canvas.style.width = `${safeWidth}px`;
      canvas.style.height = `${safeHeight}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = ctx;
      viewportRef.current = { width: safeWidth, height: safeHeight };
      setViewportVersion((prev) => prev + 1);
      render();
    };

    requestAnimationFrame(measure);
  }, [open, render, surfaceScale]);

  useEffect(() => {
    if (!open) return;
    ensureCanvasSize();
  }, [ensureCanvasSize, open, box.height, box.width, surfaceScale]);

  useEffect(() => {
    if (!open) return;
    const surface = areaRef.current;
    if (!surface || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      ensureCanvasSize();
    });
    observer.observe(surface);
    return () => observer.disconnect();
  }, [ensureCanvasSize, open]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      ensureCanvasSize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ensureCanvasSize, open]);

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
      const { width, height } = viewportRef.current;
      if (!width || !height) {
        return { scale, offsetX: value.offsetX, offsetY: value.offsetY };
      }
      const drawWidth = imageSize.width * baseScale * scale;
      const drawHeight = imageSize.height * baseScale * scale;
      const minX = width - drawWidth;
      const minY = height - drawHeight;
      return {
        scale,
        offsetX: Math.min(Math.max(value.offsetX, minX), 0),
        offsetY: Math.min(Math.max(value.offsetY, minY), 0),
      };
    },
    [baseScale, clampScale, imageSize],
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

  useEffect(() => {
    if (!open || !imageSize) return;
    applyTransform(transformRef.current);
  }, [applyTransform, baseScale, imageSize, open]);

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

      const { width, height } = viewportRef.current;
      if (!width || !height) {
        applyTransform({ ...base, scale });
        return;
      }
      const baseAbsScale = baseScale * base.scale;
      const newAbsScale = baseScale * scale;
      const baseDrawWidth = imageSize.width * baseAbsScale;
      const baseDrawHeight = imageSize.height * baseAbsScale;
      const baseLeft = (width - baseDrawWidth) / 2 + base.offsetX;
      const baseTop = (height - baseDrawHeight) / 2 + base.offsetY;
      const imgX = (baseCenter.x - baseLeft) / baseAbsScale;
      const imgY = (baseCenter.y - baseTop) / baseAbsScale;
      const drawWidth = imageSize.width * newAbsScale;
      const drawHeight = imageSize.height * newAbsScale;
      const newLeft = nextCenter.x - imgX * newAbsScale;
      const newTop = nextCenter.y - imgY * newAbsScale;
      const offsetX = newLeft - (width - drawWidth) / 2;
      const offsetY = newTop - (height - drawHeight) / 2;
      applyTransform({ scale, offsetX, offsetY });
    },
    [applyTransform, baseScale, clampScale, imageSize],
  );

  const resetGesture = useCallback(() => {
    pointerPositions.current.clear();
    gestureRef.current = { mode: 'none' };
  }, []);

  const getLocalPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const surface = areaRef.current;
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
      areaRef.current?.setPointerCapture(event.pointerId);
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
              ref={areaRef}
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
