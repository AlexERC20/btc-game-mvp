import React, { useState } from 'react';
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import ShareIcon from '../icons/ShareIcon';
import { useCarouselStore } from '@/state/store';
import { shareSlides } from '@/features/carousel/utils/exportSlides';
import '../styles/bottom-bar.css';

export default function BottomBar() {
  const openSheet = useCarouselStore((s) => s.openSheet);
  const story = useCarouselStore((s) => s.story);
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
      await shareSlides(story);
    } catch (e) {
      console.error(e);
      alert('Не удалось поделиться. Попробуйте ещё раз.');
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
