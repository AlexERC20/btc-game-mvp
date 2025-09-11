import React from 'react'
import { useStore } from '../state/store'
import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons'

export default function BottomBar() {
  const setOpenSheet = useStore(s => s.setOpenSheet)

  const items = [
    { id: 'template', label: 'Template', icon: <IconTemplate />, onClick: () => setOpenSheet('template') },
    { id: 'layout', label: 'Layout', icon: <IconLayout />, onClick: () => setOpenSheet('layout') },
    { id: 'fonts', label: 'Fonts', icon: <IconFonts />, onClick: () => setOpenSheet('fonts') },
    { id: 'photos', label: 'Photos', icon: <IconPhotos />, onClick: () => setOpenSheet('photos') },
    { id: 'info', label: 'Info', icon: <IconInfo />, onClick: () => setOpenSheet('info') },
  ]

  return (
    <nav className="toolbar" role="toolbar" aria-label="Carousel toolbar">
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          className="toolbar__item"
          onClick={it.onClick}
          aria-label={it.label}
        >
          <span className="toolbar__icon">{it.icon}</span>
          <span className="toolbar__label">{it.label}</span>
        </button>
      ))}
    </nav>
  )
}
