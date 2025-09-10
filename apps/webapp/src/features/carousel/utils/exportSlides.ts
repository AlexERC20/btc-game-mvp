import domtoimage from 'dom-to-image-more';

interface Options {
  containerSelector: string;
  hideSelectors?: string[];
  format?: 'png' | 'jpeg';
  quality?: number;
}

export async function exportSlides({
  containerSelector,
  hideSelectors = [],
  format = 'jpeg',
  quality = 0.92,
}: Options) {
  const container = document.querySelector<HTMLElement>(containerSelector);
  if (!container) throw new Error('Container not found');
  const cards = Array.from(
    container.querySelectorAll<HTMLElement>('[data-export-card]')
  );

  const hidden: HTMLElement[] = [];
  hideSelectors.forEach(sel => {
    document.querySelectorAll<HTMLElement>(sel).forEach(el => {
      (el as any).dataset._prevVisibility = el.style.visibility || '';
      el.style.visibility = 'hidden';
      hidden.push(el);
    });
  });

  for (let i = 0; i < cards.length; i++) {
    const cardEl = cards[i];
    const blob = await domtoimage.toBlob(cardEl, {
      quality,
      bgcolor: 'transparent',
      style: { transform: 'none' },
    });
    const ext = format === 'png' ? 'png' : 'jpeg';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `slide-${i + 1}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  hidden.forEach(el => {
    el.style.visibility = (el as any).dataset._prevVisibility || '';
    delete (el as any).dataset._prevVisibility;
  });
}
