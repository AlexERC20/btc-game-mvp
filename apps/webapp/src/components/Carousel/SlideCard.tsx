import { Slide } from '@/state/store';

export function SlideCard({
  slide,
  aspect,
}: {
  slide: Slide;
  aspect: number;
}) {
  return (
    <div className="ig-frame" style={{ aspectRatio: aspect }}>
      {slide.image ? (
        <img src={slide.image} alt="" draggable={false} />
      ) : (
        <div className="ig-placeholder" />
      )}
      {(slide.body || slide.nickname) && (
        <div className="overlay">
          {slide.body && <div className="caption">{slide.body}</div>}
          {slide.nickname && <div className="nick">{slide.nickname}</div>}
        </div>
      )}
    </div>
  );
}
