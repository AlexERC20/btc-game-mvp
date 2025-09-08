import PreviewList from './PreviewList';
import PreviewCard from './PreviewCard';

export default function BuilderPreview({slides, mode, textPosition, username}: {
  slides: { id: string; text: string; image?: string }[];
  mode: 'story' | 'carousel';
  textPosition: 'bottom' | 'top';
  username: string;
}) {
  return (
    <PreviewList>
      {slides.map(s => (
        <PreviewCard
          key={s.id}
          mode={mode}
          image={s.image}
          text={s.text}
          username={username.replace(/^@/, '')}
          textPosition={textPosition}
        />
      ))}
    </PreviewList>
  );
}
