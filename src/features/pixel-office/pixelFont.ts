/**
 * Tiny 3×5 bitmap font so room plaques and signs are real pixels drawn on the
 * same grid as the art (no DOM text, no anti-aliasing, scales with the scene).
 */

const G: Record<string, string> = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101010',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '110101101101101',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101110011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '101101111111101',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  '0': '111101101101111',
  '1': '010110010010111',
  '2': '110001010100111',
  '3': '110001010001110',
  '4': '101101111001001',
  '5': '111100110001110',
  '6': '011100111101111',
  '7': '111001010010010',
  '8': '111101111101111',
  '9': '111101111001110',
  '/': '001001010100100',
  '&': '010101010101011',
  '.': '000000000000010',
  '-': '000000111000000',
  '!': '010010010000010',
  '?': '110001010000010',
  ':': '000010000010000',
  '+': '000010111010000',
  ' ': '000000000000000',
}

export const FONT_W = 3
export const FONT_H = 5

export function measurePixelText(text: string): number {
  return text.length === 0 ? 0 : text.length * (FONT_W + 1) - 1
}

export function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.fillStyle = color
  let cx = x
  for (const raw of text.toUpperCase()) {
    const glyph = G[raw] ?? G['?']!
    for (let i = 0; i < 15; i++) {
      if (glyph[i] === '1') ctx.fillRect(cx + (i % 3), y + Math.floor(i / 3), 1, 1)
    }
    cx += FONT_W + 1
  }
}

/** Dark plaque with light text, 1px border — used for room names on walls. */
export function drawPlaque(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  topY: number,
  colors: { bg: string; border: string; fg: string; shadow: string },
): void {
  const w = measurePixelText(text) + 7
  const h = FONT_H + 4
  const x = Math.round(centerX - w / 2)
  ctx.fillStyle = colors.shadow
  ctx.fillRect(x + 1, topY + 1, w, h)
  ctx.fillStyle = colors.border
  ctx.fillRect(x, topY, w, h)
  ctx.fillStyle = colors.bg
  ctx.fillRect(x + 1, topY + 1, w - 2, h - 2)
  drawPixelText(ctx, text, x + 4, topY + 2, colors.fg)
}
