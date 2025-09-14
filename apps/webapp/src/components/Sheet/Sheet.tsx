import { PropsWithChildren, ReactNode, useEffect } from 'react';
import { useCarouselStore } from '@/state/store';

export default function Sheet({ title, left, right, children }: PropsWithChildren<{ title: string; left?: ReactNode; right?: ReactNode }>) {
  const close = useCarouselStore(s => s.closeSheet);
  useEffect(() => {
    const onEsc = (e:KeyboardEvent)=>{ if(e.key==='Escape') close(); };
    window.addEventListener('keydown', onEsc); return ()=>window.removeEventListener('keydown', onEsc);
  }, [close]);

  return (
    <div className="sheet" aria-open="true" onClick={close}>
      <div className="sheet__overlay" />
      <div className="sheet__panel" onClick={e=>e.stopPropagation()}>
        <div className="sheet__header">
          {left && <div className="sheet__header-left">{left}</div>}
          <h3>{title}</h3>
          {right ? (
            <div className="sheet__header-right">{right}</div>
          ) : (
            <button className="sheet__close" onClick={close}>×</button>
          )}
        </div>
        <div className="sheet__content">{children}</div>
      </div>
    </div>
  );
}
