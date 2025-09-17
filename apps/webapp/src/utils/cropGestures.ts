import { useCallback, useEffect, useRef } from 'react';

type Point = { x: number; y: number };

type CropGestureInternal = {
  scale: number;
  x: number;
  y: number;
  pts: Map<number, Point>;
  raf: number;
  pinchDistance: number;
};

type CropInitialTransform = {
  scale?: number;
  offsetX?: number;
  offsetY?: number;
};

type UseCropGesturesConfig = {
  frameRef: React.RefObject<HTMLElement>;
  imgRef: React.RefObject<HTMLElement>;
  minScale: number;
  initial: CropInitialTransform;
};

const MAX_SCALE = 3;

function applyCropTransform(element: HTMLElement, state: CropGestureInternal) {
  element.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
}

export function useCropGestures({ frameRef, imgRef, minScale, initial }: UseCropGesturesConfig) {
  const stateRef = useRef<CropGestureInternal>({
    scale: Math.max(initial.scale ?? 1, minScale),
    x: initial.offsetX ?? 0,
    y: initial.offsetY ?? 0,
    pts: new Map(),
    raf: 0,
    pinchDistance: 0,
  });

  const apply = useCallback(() => {
    stateRef.current.raf = 0;
    const img = imgRef.current;
    if (!img) return;
    applyCropTransform(img, stateRef.current);
  }, [imgRef]);

  const schedule = useCallback(() => {
    const current = stateRef.current;
    if (current.raf) return;
    current.raf = requestAnimationFrame(apply);
  }, [apply]);

  useEffect(() => {
    const state = stateRef.current;
    state.scale = Math.max(initial.scale ?? 1, minScale);
    state.x = initial.offsetX ?? 0;
    state.y = initial.offsetY ?? 0;
    schedule();
  }, [initial.offsetX, initial.offsetY, initial.scale, minScale, schedule]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const state = stateRef.current;
    const pointers = state.pts;

    frame.style.touchAction = 'none';

    const handlePointerDown = (event: PointerEvent) => {
      frame.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        state.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const point = pointers.get(event.pointerId);
      if (!point) return;

      const prevX = point.x;
      const prevY = point.y;
      point.x = event.clientX;
      point.y = event.clientY;

      if (pointers.size === 1) {
        state.x += event.clientX - prevX;
        state.y += event.clientY - prevY;
        schedule();
        return;
      }

      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        const nextDistance = Math.hypot(a.x - b.x, a.y - b.y);
        if (!Number.isFinite(nextDistance) || nextDistance <= 0) {
          state.pinchDistance = 0;
          return;
        }

        if (!Number.isFinite(state.pinchDistance) || state.pinchDistance <= 0) {
          state.pinchDistance = nextDistance;
          return;
        }

        const frameRect = frame.getBoundingClientRect();
        const centerX = (a.x + b.x) / 2 - frameRect.left;
        const centerY = (a.y + b.y) / 2 - frameRect.top;

        const previousScale = state.scale;
        const ratio = nextDistance / state.pinchDistance;
        const unclamped = previousScale * ratio;
        const nextScale = Math.max(minScale, Math.min(MAX_SCALE, unclamped));
        const appliedRatio = nextScale / previousScale;

        state.x = centerX - (centerX - state.x) * appliedRatio;
        state.y = centerY - (centerY - state.y) * appliedRatio;
        state.scale = nextScale;

        state.pinchDistance = appliedRatio === 0 ? nextDistance : nextDistance / appliedRatio;
        schedule();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) {
        state.pinchDistance = 0;
      }
    };

    frame.addEventListener('pointerdown', handlePointerDown, { passive: false });
    frame.addEventListener('pointermove', handlePointerMove, { passive: false });
    frame.addEventListener('pointerup', handlePointerUp);
    frame.addEventListener('pointercancel', handlePointerUp);
    frame.addEventListener('pointerleave', handlePointerUp);

    return () => {
      frame.removeEventListener('pointerdown', handlePointerDown);
      frame.removeEventListener('pointermove', handlePointerMove);
      frame.removeEventListener('pointerup', handlePointerUp);
      frame.removeEventListener('pointercancel', handlePointerUp);
      frame.removeEventListener('pointerleave', handlePointerUp);
      pointers.clear();
      state.pinchDistance = 0;
    };
  }, [frameRef, minScale, schedule]);

  useEffect(
    () => () => {
      if (stateRef.current.raf) {
        cancelAnimationFrame(stateRef.current.raf);
        stateRef.current.raf = 0;
      }
    },
    [],
  );

  return stateRef;
}
