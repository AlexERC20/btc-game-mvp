import React, { useEffect, useRef } from 'react';
import type { Slide } from '../types';
import { drawSlide, SlideRenderModel } from '../core/drawSlide';
import { CANVAS_W, CANVAS_H } from '../core/constants';

type Props = {
  slide: Slide;
  index: number;
  total: number;
  textPosition: 'top' | 'bottom';
  username: string;
  theme: 'photo' | 'light' | 'dark';
  fontSize: number;
  color: string;
};

export function SlidePreview({ slide, index, total, textPosition, username, theme, fontSize, color }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cnv = ref.current;
    if (!cnv) return;
    const ctx = cnv.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = slide.image || '';
    const draw = () => {
      drawSlide(ctx, {
        img,
        template: theme,
        text: { body: slide.body || '', align: textPosition, color, fontSize },
        username: username.replace(/^@/, ''),
        page: { index: index + 1, total, showArrow: index + 1 < total },
      });
    };
    if (img.complete) draw(); else { img.onload = draw; }
  }, [slide, index, total, textPosition, username, theme, fontSize, color]);

  return <canvas ref={ref} width={CANVAS_W} height={CANVAS_H} className="slideCard" />;
}

export default SlidePreview;
