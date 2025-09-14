import { useCarouselStore } from '@/state/store';
import { IconShare, IconAa, IconTemplate, IconPhoto, IconLayout } from '@/ui/icons';
import { shareAllSlides } from '@/features/export/share';

export default function BottomBar(){
  const openSheet = useCarouselStore(s=>s.openSheet);
  const slides = useCarouselStore(s=>s.slides);

  const handleShare = async () => {
    try {
      await shareAllSlides(slides);
    } catch (e) {
      alert('Не удалось поделиться. Попробуйте ещё раз.');
      console.error(e);
    }
  };

  const items = [
    { key:'export',  label:'Export',   icon:<IconShare/>,    onClick:handleShare },
    { key:'text',    label:'Text',     icon:<IconAa/>,       onClick:()=>openSheet('text') },
    { key:'template',label:'Template', icon:<IconTemplate/>, onClick:()=>openSheet('template') },
    { key:'photos',  label:'Photos',   icon:<IconPhoto/>,    onClick:()=>openSheet('photos') },
    { key:'layout',  label:'Layout',   icon:<IconLayout/>,   onClick:()=>openSheet('layout') },
  ];

  return (
    <nav className="toolbar" role="toolbar">
      {items.map(it=>(
        <button key={it.key} className="toolbar__btn" onClick={it.onClick}>
          <span className="toolbar__icon">{it.icon}</span>
          <span className="toolbar__label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
