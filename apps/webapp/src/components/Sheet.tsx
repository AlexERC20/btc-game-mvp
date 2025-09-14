import React from 'react';
import { createPortal } from 'react-dom';
import './Sheet.css';

type Props = {
  title?: string;
  onClose(): void;
  children: React.ReactNode;
};

export default function Sheet({ title, onClose, children }: Props) {
  const root = document.getElementById('sheets-root');
  if (!root) return null;
  return createPortal(
    <div className="sheet" aria-open="true">
      <div className="sheet__overlay" onClick={onClose} />
      <div className="sheet__panel">
        {title && <div className="sheet__title">{title}</div>}
        {children}
      </div>
    </div>,
    root
  );
}
