export const isDarkColor = (hex) => {
  if (!hex || !hex.startsWith('#')) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
};

export const getTextColor = (bgHex) =>
  isDarkColor(bgHex) ? '#ffffff' : '#111827';

export const getSubtextColor = (bgHex) =>
  isDarkColor(bgHex) ? 'rgba(255,255,255,0.65)' : '#6b7280';

export const getLuminance = (hex) => {
  if (!hex || !hex.startsWith('#')) return 0;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

export const getContrastRatio = (hex1, hex2) => {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const getBestContrastColor = (bg, primary, accent) => {
  const candidates = [primary, accent, '#ffffff', '#000000'].filter(Boolean);
  let bestColor = '#ffffff';
  let bestRatio = 0;
  for (const color of candidates) {
    const ratio = getContrastRatio(bg, color);
    if (ratio > bestRatio) { bestRatio = ratio; bestColor = color; }
  }
  return bestColor;
};
