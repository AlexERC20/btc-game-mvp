import { createPortal } from 'react-dom';

type BottomSheetProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return createPortal(
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={e => e.stopPropagation()}>
        {title && <div className="sheet__title">{title}</div>}
        <div className="sheet__content">{children}</div>
      </div>
    </div>,
    document.body
  );
}

