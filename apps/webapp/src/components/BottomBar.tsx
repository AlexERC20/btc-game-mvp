import React from 'react'
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons'

type Sheet = null | 'template' | 'layout' | 'fonts' | 'photos' | 'info'

type Props = {
  activeSheet: Sheet
  onOpenSheet: (name: Exclude<Sheet, null>) => void
}

export default function BottomBar({ activeSheet, onOpenSheet }: Props) {
  const items: { id: Exclude<Sheet, null>; label: string; icon: JSX.Element }[] = [
    { id: 'template', label: 'Template', icon: <IconTemplate /> },
    { id: 'layout', label: 'Layout', icon: <IconLayout /> },
    { id: 'fonts', label: 'Fonts', icon: <IconFonts /> },
    { id: 'photos', label: 'Photos', icon: <IconPhotos /> },
    { id: 'info', label: 'Info', icon: <IconInfo /> },
  ]

  return (
    <nav className="toolbar" role="toolbar" aria-label="Carousel toolbar">
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          className="toolbar__item"
          onClick={() => onOpenSheet(it.id)}
          aria-pressed={activeSheet === it.id}
          aria-label={it.label}
        >
          <span className="toolbar__icon">{it.icon}</span>
          <span className="toolbar__label">{it.label}</span>
        </button>
      ))}
    </nav>
  )
}
