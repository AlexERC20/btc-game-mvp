import { useCallback, useEffect, useRef } from 'react';

export type CropTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type ClampTransform = (value: CropTransform) => CropTransform;

export type UseCropGesturesConfig = {
  boxRef: React.RefObject<HTMLElement>;
  imgRef: React.RefObject<HTMLElement>;
  initial: CropTransform;
  clamp: ClampTransform;
};

export type UseCropGesturesResult = {
  getTransform: () => CropTransform;
  setTransform: (value: CropTransform | ((prev: CropTransform) => CropTransform)) => void;
};

type Point = { x: number; y: number };

type PinchState = {
  distance: number;
  center: Point;
} | null;

export const clampValue = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
};

export function applyTransform(element: HTMLElement, scale: number, offsetX: number, offsetY: number) {
  const translateX = scale !== 0 ? offsetX / scale : 0;
  const translateY = scale !== 0 ? offsetY / scale : 0;
  element.dataset.cropScale = String(scale);
  element.dataset.cropOffsetX = String(offsetX);
  element.dataset.cropOffsetY = String(offsetY);
  element.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
}

export function readTransform(element: HTMLElement): CropTransform {
  const scale = Number(element.dataset.cropScale ?? '1');
  const offsetX = Number(element.dataset.cropOffsetX ?? '0');
  const offsetY = Number(element.dataset.cropOffsetY ?? '0');
  return {
    scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
    offsetX: Number.isFinite(offsetX) ? offsetX : 0,
    offsetY: Number.isFinite(offsetY) ? offsetY : 0,
  };
}

export function useCropGestures({ boxRef, imgRef, initial, clamp }: UseCropGesturesConfig): UseCropGesturesResult {
  const transformRef = useRef<CropTransform>(initial);
  const rafRef = useRef(0);
  const dirtyRef = useRef(true);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const pinchRef = useRef<PinchState>(null);

  const flush = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const { scale, offsetX, offsetY } = transformRef.current;
    applyTransform(img, scale, offsetX, offsetY);
  }, [imgRef]);

  const schedule = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      dirtyRef.current = false;
      flush();
    });
  }, [flush]);

  const setTransform = useCallback<UseCropGesturesResult['setTransform']>(
    (value) => {
      transformRef.current = clamp(
        typeof value === 'function' ? (value as (prev: CropTransform) => CropTransform)(transformRef.current) : value,
      );
      dirtyRef.current = true;
      schedule();
    },
    [clamp, schedule],
  );

  useEffect(() => {
    transformRef.current = clamp(initial);
    dirtyRef.current = true;
    schedule();
  }, [clamp, initial, schedule]);

  useEffect(() => {
    const area = boxRef.current;
    if (!area) return;

    area.style.touchAction = 'none';

    const handlePointerDown = (event: PointerEvent) => {
      if (!boxRef.current) return;
      boxRef.current.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointersRef.current.size === 2) {
        const values = Array.from(pointersRef.current.values());
        pinchRef.current = {
          center: {
            x: (values[0].x + values[1].x) / 2,
            y: (values[0].y + values[1].y) / 2,
          },
          distance: Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y),
        };
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const previous = pointersRef.current.get(event.pointerId);
      if (!previous) return;

      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointersRef.current.size === 1) {
        const dx = event.clientX - previous.x;
        const dy = event.clientY - previous.y;
        setTransform((prev) => ({
          scale: prev.scale,
          offsetX: prev.offsetX + dx,
          offsetY: prev.offsetY + dy,
        }));
        return;
      }

      if (pointersRef.current.size === 2) {
        const rect = boxRef.current?.getBoundingClientRect();
        if (!rect) return;
        const [pA, pB] = Array.from(pointersRef.current.values());
        const center: Point = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
        const distance = Math.hypot(pA.x - pB.x, pA.y - pB.y);
        const pinch = pinchRef.current;
        if (!pinch || !Number.isFinite(pinch.distance) || pinch.distance <= 0) {
          pinchRef.current = { center, distance };
          return;
        }

        setTransform((prev) => {
          if (prev.scale <= 0) return prev;
          const ratio = distance / pinch.distance;
          const scaled = clamp({ scale: prev.scale * ratio, offsetX: prev.offsetX, offsetY: prev.offsetY });
          const appliedRatio = scaled.scale / prev.scale;
          const cx = center.x - rect.left;
          const cy = center.y - rect.top;
          const next = clamp({
            scale: scaled.scale,
            offsetX: cx - (cx - prev.offsetX) * appliedRatio,
            offsetY: cy - (cy - prev.offsetY) * appliedRatio,
          });

          const actualRatio = next.scale / prev.scale;
          pinchRef.current = {
            center,
            distance: actualRatio === 0 ? distance : distance / actualRatio,
          };
          return next;
        });
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size < 2) {
        pinchRef.current = null;
      }
    };

    area.addEventListener('pointerdown', handlePointerDown);
    area.addEventListener('pointermove', handlePointerMove);
    area.addEventListener('pointerup', handlePointerUp);
    area.addEventListener('pointercancel', handlePointerUp);
    area.addEventListener('pointerleave', handlePointerUp);

    return () => {
      area.removeEventListener('pointerdown', handlePointerDown);
      area.removeEventListener('pointermove', handlePointerMove);
      area.removeEventListener('pointerup', handlePointerUp);
      area.removeEventListener('pointercancel', handlePointerUp);
      area.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [boxRef, setTransform]);

  useEffect(() => () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (dirtyRef.current) {
      flush();
      dirtyRef.current = false;
    }
  });

  return {
    getTransform: () => transformRef.current,
    setTransform,
  };
}
