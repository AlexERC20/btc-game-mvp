import { useState, useMemo, useCallback, useEffect, type SyntheticEvent } from 'react';
import type { PhotoTransform } from '@/state/store';
import { placeImage } from '@/utils/placeImage';

type Box = { width: number; height: number };

type Props = {
  src: string;
  box: Box;
  transform: PhotoTransform;
  className?: string;
  onLoad?: (size: { width: number; height: number }) => void;
};

export function CollageSlotImage({ src, box, transform, className, onLoad }: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setSize(null);
  }, [src]);

  const handleLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (width && height) {
      setSize({ width, height });
      onLoad?.({ width, height });
    }
  }, [onLoad]);

  const style = useMemo(() => {
    if (!size) {
      return {
        position: 'absolute' as const,
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        visibility: 'hidden' as const,
      };
    }

    const placement = placeImage(
      { x: 0, y: 0, width: box.width, height: box.height },
      size.width,
      size.height,
      transform,
    );

    return {
      position: 'absolute' as const,
      left: `${placement.left}px`,
      top: `${placement.top}px`,
      width: `${placement.width}px`,
      height: `${placement.height}px`,
      transform: 'translate3d(0,0,0)',
    };
  }, [box.height, box.width, size, transform.offsetX, transform.offsetY, transform.scale]);

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      onLoad={handleLoad}
      style={style}
    />
  );
}

