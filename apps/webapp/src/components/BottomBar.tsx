import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons'

type Props = {
  onOpenSheet: (name: 'template' | 'layout' | 'fonts' | 'photos' | 'info') => void
}

export default function BottomBar({ onOpenSheet }: Props) {
  return (
    <div className="toolbar">
      <button className="toolbar__btn" onClick={() => onOpenSheet('template')}>
        <span className="toolbar__icon"><IconTemplate /></span>
        <span className="toolbar__label">Template</span>
      </button>
      <button className="toolbar__btn" onClick={() => onOpenSheet('layout')}>
        <span className="toolbar__icon"><IconLayout /></span>
        <span className="toolbar__label">Layout</span>
      </button>
      <button className="toolbar__btn" onClick={() => onOpenSheet('fonts')}>
        <span className="toolbar__icon"><IconFonts /></span>
        <span className="toolbar__label">Fonts</span>
      </button>
      <button className="toolbar__btn" onClick={() => onOpenSheet('photos')}>
        <span className="toolbar__icon"><IconPhotos /></span>
        <span className="toolbar__label">Photos</span>
      </button>
      <button className="toolbar__btn" onClick={() => onOpenSheet('info')}>
        <span className="toolbar__icon"><IconInfo /></span>
        <span className="toolbar__label">Info</span>
      </button>
    </div>
  )
}

