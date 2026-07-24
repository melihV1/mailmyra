export function isValidHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function normalizeHex(value: string): string {
  const v = value.trim().toLowerCase();
  if (!isValidHex(v)) throw new Error(`Invalid hex color: ${value}`);
  if (v.length === 4) {
    return `#${v
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  return v;
}

function relativeLuminance(hex: string): number {
  const n = normalizeHex(hex).slice(1);
  const channel = (start: number) => parseInt(n.slice(start, start + 2), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(channel(0)) + 0.7152 * lin(channel(2)) + 0.0722 * lin(channel(4));
}

/** Verilen arka plan üstünde en okunur metin rengini (siyah/beyaz) döndürür. */
export function readableTextOn(hexBackground: string): '#ffffff' | '#000000' {
  return relativeLuminance(hexBackground) > 0.5 ? '#000000' : '#ffffff';
}

/** WCAG 2.x kontrast oranı (1..21). Girdiler hex renk. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
