import React, { useEffect, useRef } from 'react';
import type { Slide } from '../types';
import { renderSlideToCanvas } from '../core/render';
import { CANVAS_PRESETS, CanvasMode } from '../core/constants';

import type { Theme } from '../types';

interface Props {
  slide: Slide;
  index: number;
  total: number;
  textPosition: 'top' | 'bottom';
  username: string;
  theme: Theme;
  fontSize: number;
  lineHeight: number;
  color: string;
  mode: CanvasMode;
}

export function SlidePreview({ slide, index, total, textPosition, username, theme, fontSize, lineHeight, color, mode }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cnv = ref.current;
    if (!cnv) return;
    const ctx = cnv.getContext('2d');
    if (!ctx) return;
    const preset = CANVAS_PRESETS[mode];
    renderSlideToCanvas(slide, ctx, {
      width: preset.w,
      height: preset.h,
      theme,
      layout: { textPosition, textSize: fontSize, lineHeight, color },
      username: username.replace(/^@/, ''),
      page: { index: index + 1, total, showArrow: index + 1 < total },
    });
  }, [slide, index, total, textPosition, username, theme, fontSize, lineHeight, color, mode]);

  const preset = CANVAS_PRESETS[mode];
  return (
    <canvas
      ref={ref}
      width={preset.w}
      height={preset.h}
      style={{ aspectRatio: `${preset.w} / ${preset.h}` }}
      className="slideCard"
    />
  );
}

export default SlidePreview;
