export function SlideCard({
  slide,
  aspect,
}: {
  slide: { imageUrl?: string };
  aspect: number;
}) {
  return (
    <div className="ig-frame" style={{ aspectRatio: aspect }}>
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" draggable={false} />
      ) : (
        <div className="ig-placeholder" />
      )}
    </div>
  );
}

