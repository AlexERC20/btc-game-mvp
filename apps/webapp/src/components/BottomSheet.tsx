import { createPortal } from 'react-dom';
import '../styles/bottom-sheet.css';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string | null;
  children: React.ReactNode;
};

export default function BottomSheet({ open, onClose, title, children }: Props) {
  if (!open) return null;
  const root = document.getElementById('sheets-root');
  if (!root) return null;

  const sheet = (
    <div className="sheet__overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        {title !== null ? (
          <>
            {title && <div className="sheet__title">{title}</div>}
            <div className="sheet__content">{children}</div>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );

  return createPortal(sheet, root);
}


