import React, { useState } from 'react';
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useStore } from '../state/store';
import { shareSlides } from '../features/carousel/utils/exportSlides';
import '../styles/bottom-bar.css';

export default function BottomBar() {
  const openSheet = useStore(s => s.openSheet);
  const slides = useStore(s => s.slides);
  const [isSharing, setIsSharing] = useState(false);

  const actions = [
    { key: 'template', label: 'Template', icon: <IconTemplate /> },
    { key: 'layout',   label: 'Layout',   icon: <IconLayout /> },
    { key: 'fonts',    label: 'Fonts',    icon: <IconFonts /> },
    { key: 'photos',   label: 'Photos',   icon: <IconPhotos /> },
    { key: 'info',     label: 'Info',     icon: <IconInfo /> },
  ];

  const onShare = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);
      await shareSlides({ slides });
    } catch (e) {
      console.error(e);
      alert('Не удалось открыть системное меню "Поделиться". Попробуйте ещё раз.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <nav className="toolbar" role="toolbar">
      {actions.map(a => (
        <button key={a.key} className="toolbar__btn" onClick={() => openSheet(a.key as any)}>
          <span className="toolbar__icon">{a.icon}</span>
          <span className="toolbar__label">{a.label}</span>
        </button>
      ))}
      <button
        className="toolbar__btn"
        onClick={onShare}
        aria-label="Share"
        disabled={isSharing}
      >
        <span className="toolbar__icon">
          <ShareIcon />
        </span>
        <span className="toolbar__label">Share</span>
      </button>
    </nav>
  );
}
