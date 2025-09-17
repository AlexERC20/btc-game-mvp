import { useState, useMemo, useCallback, useEffect, type SyntheticEvent } from 'react';
import type { PhotoTransform } from '@/state/store';
import { computeCoverScale } from '@/utils/collage';

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
        objectFit: 'cover' as const,
        objectPosition: 'center' as const,
      };
    }

    const scaleBase = computeCoverScale(size.width, size.height, box.width, box.height);
    const finalScale = scaleBase * transform.scale;
    const drawWidth = size.width * finalScale;
    const drawHeight = size.height * finalScale;
    const dx = (box.width - drawWidth) / 2 + transform.offsetX;
    const dy = (box.height - drawHeight) / 2 + transform.offsetY;

    return {
      position: 'absolute' as const,
      left: `${dx}px`,
      top: `${dy}px`,
      width: `${drawWidth}px`,
      height: `${drawHeight}px`,
      objectFit: 'cover' as const,
      objectPosition: 'center' as const,
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

