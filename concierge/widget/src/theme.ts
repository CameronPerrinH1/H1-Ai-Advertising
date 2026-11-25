// Applies the client's brand colors and fonts, darkening the brand color if white text on it
// would fail WCAG AA contrast (D46, build plan 9.3).
import type { PublicConfig } from '@concierge/shared';

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x) as [number, number];
  return (la + 0.05) / (lb + 0.05);
}

// Mix toward black until white text passes 4.5:1.
export function accessibleOnWhiteText(hex: string): string {
  let c = rgb(hex);
  for (let i = 0; i < 20 && contrast(toHex(c), '#ffffff') < 4.5; i++) c = c.map((v) => v * 0.94) as [number, number, number];
  return toHex(c);
}

export function applyTheme(config: PublicConfig): void {
  const root = document.documentElement.style;
  const { primary, secondary, accent } = config.branding.colors;
  root.setProperty('--brand', accessibleOnWhiteText(primary));
  root.setProperty('--brand-raw', primary);
  root.setProperty('--brand-soft', secondary);
  root.setProperty('--ink', accent);
  root.setProperty('--font-heading', config.branding.fonts.heading);
  root.setProperty('--font-body', config.branding.fonts.body);
}
