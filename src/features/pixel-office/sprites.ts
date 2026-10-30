/**
 * Original pixel-art assets, drawn procedurally (docs/ASSET_LICENSES.md:
 * "Prefer original assets created for this project"). No third-party sprites
 * are used anywhere in this scene.
 *
 * Character sprites are 16×24 pixel matrices on a 16px tile grid — chunky
 * Growtopia-inspired proportions (big head, small body, thick dark outline,
 * flat fills + one shade step) while remaining entirely original. They are
 * composed from a base body + hair style + role accessory and cached per look. Each character maps the matrix
 * letters to its own palette (hair/skin/shirt/pants).
 *
 * Furniture is drawn with primitive fillRect operations on the same 16px grid
 * (see officeMap.ts) using top faces + front faces for a top-down 3/4 look.
 */

export const TILE = 16
export const MAP_W = 32
export const MAP_H = 20
export const SCENE_W = MAP_W * TILE
export const SCENE_H = MAP_H * TILE

export const PAL = {
  grass: '#7dc357',
  grassDark: '#6bb24b',
  grassTuft: '#5da340',
  road: '#a7abb3',
  roadLine: '#ffffff',
  sidewalk: '#d7dade',
  sidewalkEdge: '#c2c6cd',
  wallCream: '#f6f1e6',
  wallShade: '#ded6c4',
  wallTrim: '#c3cdda',
  wallTrimDark: '#a5b1c4',
  roof: '#b9c3d4',
  roofDark: '#9fabc0',
  window: '#a8e0f8',
  windowFrame: '#4a5872',
  floorWood: '#f0c47c',
  floorWoodLine: '#dfae60',
  floorGray: '#dbe2ec',
  floorGrayLine: '#c8d0dd',
  floorDark: '#232b3d',
  floorDarkLine: '#2d3750',
  corridor: '#f5eeda',
  corridorLine: '#e4dbc4',
  mat: '#c9573f',
  matFringe: '#9c3f2c',
  wood: '#c08a5c',
  woodDark: '#8a5f3c',
  woodLight: '#e0b07c',
  sofa: '#6dbb6f',
  sofaDark: '#4f9e55',
  sofaCushion: '#85cc85',
  monitor: '#252c40',
  monitorScreen: '#8fd0ff',
  monitorStand: '#3a4358',
  chair: '#3a4358',
  chairDark: '#2c3346',
  rack: '#151b2b',
  rackFrame: '#313c58',
  ledOn: '#7be2a8',
  ledOn2: '#ffd166',
  ledOff: '#232b3d',
  plantPot: '#c96f4a',
  plantLeaf: '#4aa854',
  plantLeafDark: '#337e3e',
  tree: '#3f9c50',
  treeDark: '#2f7d3e',
  trunk: '#8a5a3a',
  rug: '#9cc4f2',
  rugDark: '#7fa9dd',
  rugGreen: '#b5d9a5',
  rugGreenDark: '#9cc48b',
  boardWhite: '#fbfbf8',
  boardFrame: '#a5754a',
  sticky1: '#ffd166',
  sticky2: '#ff9d7a',
  sticky3: '#7ab8ff',
  sticky4: '#75e0b3',
  tv: '#1a2130',
  tvScreen: '#3d5578',
  white: '#ffffff',
  dark: '#20242f',
  outline: '#20242f',
  lamp: '#ffdf8a',
  lampGlow: 'rgba(255, 221, 130, 0.18)',
} as const

/** Draw one sprite matrix at pixel (x, y). '.' and ' ' are transparent. */
export function drawSpriteMatrix(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  palette: Record<string, string>,
  x: number,
  y: number,
): void {
  for (let row = 0; row < rows.length; row++) {
    const line = rows[row] ?? ''
    for (let col = 0; col < line.length; col++) {
      const key = line.charAt(col)
      if (key === '.' || key === ' ') continue
      const color = palette[key]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x + col, y + row, 1, 1)
    }
  }
}

/** Mix a hex colour toward black (amount < 0) or white (amount > 0). */
export function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const value = Number.parseInt(clean, 16)
  if (Number.isNaN(value)) return hex
  const target = amount < 0 ? 0 : 255
  const ratio = Math.min(1, Math.abs(amount))
  const mix = (channel: number) => Math.round(channel + (target - channel) * ratio)
  const r = mix((value >> 16) & 0xff)
  const g = mix((value >> 8) & 0xff)
  const b = mix(value & 0xff)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ---------------------------------------------------------------------------
// Characters — 16×24, composed from base body + hair + role accessory
// ---------------------------------------------------------------------------

export type CharacterPose = 'idle' | 'work' | 'walkA' | 'walkB'
export type CharacterRole = 'owner' | 'admin' | 'lead' | 'member' | 'viewer'

export interface CharacterColors {
  hair: string
  skin: string
  shirt: string
  pants: string
  shoe: string
  eye: string
}

export const CHAR_W = 16
export const CHAR_H = 24
export const CHAR_HEAD_H = 12
/** Number of hair styles (headIndex % HAIR_STYLES). */
export const HAIR_STYLES = 4

type Grid = string[][]

function blank(): Grid {
  return Array.from({ length: CHAR_H }, () => Array.from({ length: CHAR_W }, () => '.'))
}
function put(g: Grid, x: number, y: number, ch: string): void {
  if (y >= 0 && y < CHAR_H && x >= 0 && x < CHAR_W) g[y]![x] = ch
}
function hline(g: Grid, y: number, x0: number, x1: number, ch: string): void {
  for (let x = x0; x <= x1; x++) put(g, x, y, ch)
}

const HEAD_BOUNDS: Record<number, [number, number]> = {
  2: [4, 11], 3: [3, 12], 4: [2, 13], 5: [2, 13], 6: [2, 13], 7: [2, 13], 8: [2, 13], 9: [2, 13], 10: [3, 12], 11: [4, 11],
}

function baseBody(pose: CharacterPose): Grid {
  const g = blank()
  for (const [ys, [x0, x1]] of Object.entries(HEAD_BOUNDS)) {
    const y = Number(ys)
    hline(g, y, x0, x1, 's')
    put(g, x0, y, 'o')
    put(g, x1, y, 'o')
    if (y === 2 || y === 11) hline(g, y, x0, x1, 'o')
  }
  put(g, 3, 9, 'S')
  put(g, 12, 9, 'S')
  hline(g, 10, 4, 11, 'S')
  for (const x of [5, 10]) {
    put(g, x, 7, 'e')
    put(g, x, 8, 'e')
  }
  put(g, 4, 9, 'k')
  put(g, 11, 9, 'k')
  put(g, 7, 10, 'm')
  put(g, 8, 10, 'm')
  hline(g, 12, 6, 9, 'S')
  put(g, 5, 12, 'o')
  put(g, 10, 12, 'o')
  for (let y = 13; y <= 19; y++) {
    hline(g, y, 2, 13, 't')
    put(g, 2, y, 'o')
    put(g, 13, y, 'o')
    put(g, 4, y, y >= 14 ? 'T' : 't')
    put(g, 11, y, y >= 14 ? 'T' : 't')
  }
  hline(g, 13, 2, 13, 'o')
  hline(g, 13, 6, 9, 'c')
  hline(g, 14, 7, 8, 'c')
  hline(g, 19, 3, 12, 'T')
  hline(g, 19, 2, 13, 'o')
  if (pose === 'work') {
    hline(g, 16, 5, 6, 'w')
    hline(g, 16, 9, 10, 'w')
    hline(g, 17, 5, 6, 'o')
    hline(g, 17, 9, 10, 'o')
  } else if (pose === 'walkA') {
    put(g, 3, 19, 'w')
    put(g, 12, 17, 'w')
  } else if (pose === 'walkB') {
    put(g, 3, 17, 'w')
    put(g, 12, 19, 'w')
  } else {
    put(g, 3, 18, 'w')
    put(g, 12, 18, 'w')
  }
  // legs + shoes (walk poses lift one foot)
  const leg = (x0: number, x1: number, rows: number, shoeY: number) => {
    for (let y = 20; y < 20 + rows; y++) {
      hline(g, y, x0, x1, 'p')
      put(g, x0 - 1, y, 'o')
      put(g, x1 + 1, y, 'o')
    }
    hline(g, shoeY, x0 - 1, x1, 'b')
  }
  if (pose === 'walkA') {
    leg(4, 7, 2, 22)
    leg(8, 11, 3, 23)
  } else if (pose === 'walkB') {
    leg(4, 7, 3, 23)
    leg(8, 11, 2, 22)
  } else {
    leg(4, 7, 3, 23)
    leg(8, 11, 3, 23)
  }
  put(g, 7, 20, 'o')
  put(g, 8, 20, 'o')
  return g
}

function hairOverlay(style: number): Grid {
  const g = blank()
  const fill = (y: number, x0: number, x1: number) => {
    hline(g, y, x0, x1, 'h')
    put(g, x0, y, 'o')
    put(g, x1, y, 'o')
  }
  if (style === 2) {
    put(g, 5, 0, 'h')
    put(g, 8, 0, 'h')
    put(g, 11, 0, 'h')
    hline(g, 1, 4, 12, 'h')
    put(g, 3, 2, 'h')
    put(g, 12, 2, 'h')
  }
  hline(g, 2, 4, 11, 'o')
  fill(3, 3, 12)
  fill(4, 2, 13)
  hline(g, 3, 5, 9, 'H')
  hline(g, 5, 3, 12, 'h')
  put(g, 2, 5, 'o')
  put(g, 13, 5, 'o')
  for (const x of [3, 4, 6, 9, 11, 12]) put(g, x, 6, 'h')
  if (style === 0) {
    put(g, 2, 6, 'o')
    put(g, 13, 6, 'o')
  }
  if (style === 1) {
    for (let y = 6; y <= 11; y++) {
      put(g, 2, y, 'o')
      put(g, 3, y, 'h')
      put(g, 12, y, 'h')
      put(g, 13, y, 'o')
    }
    hline(g, 12, 3, 4, 'h')
    hline(g, 12, 11, 12, 'h')
  }
  if (style === 3) {
    for (let y = 6; y <= 8; y++) {
      put(g, 3, y, 'h')
      put(g, 12, y, 'h')
    }
    put(g, 14, 6, 'o')
    for (let y = 7; y <= 12; y++) {
      put(g, 14, y, 'h')
      put(g, 15, y, 'o')
    }
    put(g, 13, 6, 'h')
  }
  return g
}

function roleOverlay(role: CharacterRole): Grid {
  const g = blank()
  if (role === 'owner') {
    for (let y = 14; y <= 18; y++) put(g, 7, y, 'a')
    for (let y = 15; y <= 17; y++) put(g, 8, y, 'A')
    put(g, 10, 15, 'a')
  } else if (role === 'admin') {
    for (const [a, b] of [[4, 6], [9, 11]] as const) {
      hline(g, 6, a, b, 'f')
      hline(g, 9, a, b, 'f')
      put(g, a, 7, 'f')
      put(g, b, 7, 'f')
      put(g, a, 8, 'f')
      put(g, b, 8, 'f')
    }
    put(g, 7, 7, 'f')
    put(g, 8, 7, 'f')
  } else if (role === 'lead') {
    for (let y = 13; y <= 15; y++) {
      put(g, 6, y, 'L')
      put(g, 9, y, 'L')
    }
    hline(g, 16, 6, 9, 'L')
    hline(g, 17, 7, 8, 'a')
    hline(g, 18, 7, 8, 'A')
  } else if (role === 'viewer') {
    hline(g, 15, 9, 11, 'v')
    hline(g, 16, 9, 11, 'v')
    put(g, 10, 15, 'V')
  }
  return g
}

function composite(layers: Grid[]): string[] {
  const out = blank()
  for (const layer of layers) {
    for (let y = 0; y < CHAR_H; y++) {
      for (let x = 0; x < CHAR_W; x++) {
        const ch = layer[y]![x]!
        if (ch !== '.') out[y]![x] = ch
      }
    }
  }
  return out.map((r) => r.join(''))
}

const spriteCache = new Map<string, string[]>()

export function characterSprite(headIndex: number, pose: CharacterPose, role: CharacterRole = 'member'): string[] {
  const style = ((headIndex % HAIR_STYLES) + HAIR_STYLES) % HAIR_STYLES
  const key = `${style}|${role}|${pose}`
  const cached = spriteCache.get(key)
  if (cached) return cached
  const rows = composite([baseBody(pose), hairOverlay(style), roleOverlay(role)])
  spriteCache.set(key, rows)
  return rows
}

export function characterPalette(colors: CharacterColors, blink = false): Record<string, string> {
  return {
    o: PAL.outline,
    h: colors.hair,
    H: shadeHex(colors.hair, 0.28),
    s: colors.skin,
    S: shadeHex(colors.skin, -0.12),
    k: '#f0a0a0',
    e: blink ? shadeHex(colors.skin, -0.3) : colors.eye,
    m: '#b55a4a',
    t: colors.shirt,
    T: shadeHex(colors.shirt, -0.2),
    c: '#f4f4f4',
    w: colors.skin,
    p: colors.pants,
    b: colors.shoe,
    a: '#f2c14e',
    A: '#c18f26',
    f: '#3b3f52',
    L: '#4f84d8',
    v: '#7ad49b',
    V: '#1d5d3a',
  }
}

const HAIRS = ['#2b2b33', '#5b3a24', '#8a5a2b', '#c9903f', '#4a4f66', '#7a3f2b']
const SKINS = ['#f6d0a4', '#e8b07f', '#cf935f', '#a8714a', '#80522f', '#efc08a']
const PANTS = ['#39415a', '#4a3d5c', '#2f4a44', '#4a3a2f']
const SHOES = ['#222b36', '#3a2d26', '#2f3b52']
export const EYE = '#1a1d24'

/** Deterministic per-user appearance from their id. */
export function hashIndex(id: string, modulo: number): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash % modulo
}

export function appearanceFor(userId: string): { hair: string; skin: string; pants: string; shoe: string; headIndex: number } {
  return {
    hair: HAIRS[hashIndex(userId, HAIRS.length)] ?? HAIRS[0]!,
    skin: SKINS[hashIndex(userId + 's', SKINS.length)] ?? SKINS[0]!,
    pants: PANTS[hashIndex(userId + 'p', PANTS.length)] ?? PANTS[0]!,
    shoe: SHOES[hashIndex(userId + 'b', SHOES.length)] ?? SHOES[0]!,
    headIndex: hashIndex(userId + 'hair', HAIR_STYLES),
  }
}

/** Draw a composed character. `rows` crops the lower body (seated behind a desk). */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  headIndex: number,
  pose: CharacterPose,
  palette: Record<string, string>,
  role: CharacterRole = 'member',
  rows: number = CHAR_H,
): void {
  const sprite = characterSprite(headIndex, pose, role)
  drawSpriteMatrix(ctx, sprite.slice(0, rows), palette, px, py)
}

/** Badge bubbles drawn above characters (3×5 glyph + bubble). */
export function drawBadgeBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  bg: string,
  fg: string,
  glyph: '!' | '?',
): void {
  // bubble: 11×9 rounded pixel blob with a chunky outline
  ctx.fillStyle = PAL.outline
  ctx.fillRect(cx - 6, topY - 1, 13, 9)
  ctx.fillRect(cx - 7, topY, 15, 7)
  ctx.fillStyle = bg
  ctx.fillRect(cx - 5, topY, 11, 7)
  ctx.fillRect(cx - 6, topY + 1, 13, 5)
  ctx.fillStyle = fg
  ctx.fillRect(cx - 1, topY + 1, 2, 3) // stem
  if (glyph === '!') {
    ctx.fillRect(cx - 1, topY + 5, 2, 1) // dot
  } else {
    ctx.fillRect(cx - 1, topY + 4, 2, 1)
    ctx.fillRect(cx + 1, topY + 4, 1, 2)
  }
  // tail
  ctx.fillStyle = PAL.outline
  ctx.fillRect(cx - 2, topY + 7, 4, 3)
  ctx.fillStyle = bg
  ctx.fillRect(cx - 1, topY + 7, 2, 2)
}
