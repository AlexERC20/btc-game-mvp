import React, { useState, useEffect } from 'react';
import BottomSheet from '../BottomSheet';
import { useStore } from '@/state/store';
import type { SlideId } from '../../types';

export default function TextSheet({ open, onClose, currentSlideId }: { open: boolean; onClose: () => void; currentSlideId?: SlideId }) {
  const slide = useStore(s => s.slides.find(x => x.id === currentSlideId));
  const updateSlide = useStore(s => s.updateSlide);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue(slide?.body ?? '');
  }, [open, slide?.id]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Text">
      <textarea
        className="w-full h-48 p-3 rounded-lg bg-neutral-900 border border-neutral-800 resize-none"
        placeholder="Вставьте или напишите текст…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          slide && updateSlide(slide.id, { body: e.target.value });
        }}
      />
      <div className="mt-3 flex justify-end">
        <button
          className="px-4 py-2 rounded-lg bg-neutral-800"
          onClick={() => {
            setValue('');
            slide && updateSlide(slide.id, { body: '' });
          }}
        >
          Очистить
        </button>
      </div>
    </BottomSheet>
  );
}
