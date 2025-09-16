function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(value, 1));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return [r, g, b];
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

export function applyOpacityToColor(color: string, opacity: number): string {
  const trimmed = color?.trim();
  const alpha = clamp01(opacity);
  if (!trimmed) {
    return `rgba(255,255,255,${alpha})`;
  }

  if (trimmed.startsWith('#')) {
    const rgb = hexToRgb(trimmed);
    if (!rgb) return trimmed;
    const [r, g, b] = rgb;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const rgbaMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1]
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((value) => !Number.isNaN(value));
    if (parts.length < 3) return trimmed;
    const [r, g, b] = parts;
    const baseAlpha = parts[3] ?? 1;
    const nextAlpha = clamp01(baseAlpha * alpha);
    return `rgba(${r},${g},${b},${nextAlpha})`;
  }

  return trimmed;
}
