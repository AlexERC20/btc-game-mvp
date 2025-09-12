import { IconTemplate, IconLayout, IconFonts, IconPhotos, IconInfo } from '../ui/icons';
import { useStore } from '../state/store';
import '../styles/bottom-bar.css';

export default function BottomBar() {
  const openSheet = useStore(s => s.openSheet);

  const actions = [
    { key: 'template', label: 'Template', icon: <IconTemplate /> },
    { key: 'layout',   label: 'Layout',   icon: <IconLayout /> },
    { key: 'fonts',    label: 'Fonts',    icon: <IconFonts /> },
    { key: 'photos',   label: 'Photos',   icon: <IconPhotos /> },
    { key: 'info',     label: 'Info',     icon: <IconInfo /> },
  ];

  return (
    <nav className="toolbar" role="toolbar">
      {actions.map(a => (
        <button key={a.key} className="toolbar__btn" onClick={() => openSheet(a.key as any)}>
          <span className="toolbar__icon">{a.icon}</span>
          <span className="toolbar__label">{a.label}</span>
        </button>
      ))}
    </nav>
  );
}

