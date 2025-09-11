import React from 'react'
import { exportSlides } from '@/features/carousel/utils/exportSlides'
import { useStore } from '@/state/store'
import TemplateIcon from '@/icons/TemplateIcon'
import LayoutIcon from '@/icons/LayoutIcon'
import PaletteIcon from '@/icons/PaletteIcon'
import CameraIcon from '@/icons/CameraIcon'
import InfoIcon from '@/icons/InfoIcon'
import DownloadIcon from '@/icons/DownloadIcon'

async function onExport() {
  const state: any = useStore.getState()
  const story = state.story ?? state
  const [blob] = await exportSlides(story)
  const file = new File([blob], 'slide-1.png', { type: 'image/png' })

  const nav: any = navigator
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    await nav.share({ files: [file] })
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'slide-1.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function BottomBar({ disabledExport }: { disabledExport?: boolean }) {
  const setOpenSheet = useStore(s => s.setOpenSheet)

  const items = [
    { id: 'template', label: 'Template', icon: <TemplateIcon />, onClick: () => setOpenSheet('template') },
    { id: 'layout', label: 'Layout', icon: <LayoutIcon />, onClick: () => setOpenSheet('layout') },
    { id: 'fonts', label: 'Fonts', icon: <PaletteIcon />, onClick: () => setOpenSheet('fonts') },
    { id: 'photos', label: 'Photos', icon: <CameraIcon />, onClick: () => setOpenSheet('photos') },
    { id: 'info', label: 'Info', icon: <InfoIcon />, onClick: () => setOpenSheet('info') },
    { id: 'export', label: 'Export', icon: <DownloadIcon />, onClick: onExport, disabled: disabledExport },
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
          disabled={it.disabled}
        >
          <span className="toolbar__icon">{it.icon}</span>
          <span className="toolbar__label">{it.label}</span>
        </button>
      ))}
    </nav>
  )
}
