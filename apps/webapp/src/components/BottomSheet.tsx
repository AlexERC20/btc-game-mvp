import React from 'react';
import { createPortal } from 'react-dom';

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  withToolbarGap?: boolean
  children: React.ReactNode
}

export default function BottomSheet({
  open,
  onClose,
  title,
  withToolbarGap = false,
  children,
}: BottomSheetProps) {
  if (!open) return null

  return createPortal(
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <div className="sheet-backdrop" onClick={onClose} />
      <section className={`sheet ${withToolbarGap ? 'sheet--with-toolbar-gap' : ''}`}>
        {title && <header className="sheet__title">{title}</header>}
        <div className="sheet__content">{children}</div>
      </section>
    </div>,
    document.body
  )
}

