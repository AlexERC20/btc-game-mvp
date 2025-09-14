import React from 'react';
import type { Slide } from '@/types';

export default function SlidePreview({ slide }: { slide: Slide }) {
  return slide.image ? (
    <img src={slide.image} alt="" />
  ) : (
    <div className="p-4 text-white text-center">{slide.body}</div>
  );
}
