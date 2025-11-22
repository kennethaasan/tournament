export function computeContrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);

  const brighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  return (brighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const linearR = channelToLinear(r);
  const linearG = channelToLinear(g);
  const linearB = channelToLinear(b);

  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

function channelToLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([A-Fa-f0-9]{6})$/.exec(hex);
  if (!match) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const hexValue = match[1];
  if (!hexValue) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const int = parseInt(hexValue, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
