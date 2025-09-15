export function splitEditorialText(text: string): { title: string; body: string } {
  const trimmed = text.trim();
  if (!trimmed) return { title: '', body: '' };

  const sentenceMatch = trimmed.match(/[.!?…](?:\s|\n)/);
  if (sentenceMatch && sentenceMatch.index !== undefined) {
    const idx = sentenceMatch.index + 1;
    return {
      title: trimmed.slice(0, idx).trim(),
      body: trimmed.slice(idx).trim(),
    };
  }

  const newlineIndex = trimmed.indexOf('\n');
  if (newlineIndex !== -1) {
    return {
      title: trimmed.slice(0, newlineIndex).trim(),
      body: trimmed.slice(newlineIndex + 1).trim(),
    };
  }

  return { title: trimmed, body: '' };
}
