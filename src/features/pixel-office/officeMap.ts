import { MAP_H, MAP_W, PAL, TILE } from './sprites'

/**
 * Original office floor plan inspired by the reference composition
 * (assets/references/pixel-office-reference.png): an open workspace with
 * meeting room, executive office, pantry, storage, finance room, media room,
 * project board room, entrance hall, and an event hall with a stage.
 *
 * Tile grid: 32×20 tiles of 16px (512×320 logical pixels).
 *
 * Legend: '#' exterior wall · '|' interior vertical wall · '-' interior
 * horizontal wall · 'm' wood floor · 'g' gray floor · 'c' corridor floor ·
 * 'E' entrance mat tile.
 *
 * Rendering is a top-down 3/4 view: the north wall has a visible face, and
 * furniture is drawn as chunky blocks with a top surface, a front face, a dark
 * outline, and a cast shadow (docs/REFERENCE.md "clear top-down or slight
 * isometric room layout").
 */

export interface Seat {
  /** tile coords of the character's feet anchor */
  x: number
  y: number
  /** extra pixel y-offset (e.g. sitting into a sofa) */
  dy?: number
  /** seat is centered over a 2-tile-wide desk */
  wide?: boolean
  /** the desk in front of this seat has a monitor (animated screen glow) */
  monitor?: boolean
}

/** Desk seats in the Workspace (2 per row × 5 columns) — Teknologi, Desain, and default pool. */
export const WORKSPACE_SEATS: Seat[] = [
  { x: 2, y: 7, wide: true, monitor: true }, { x: 4, y: 7, wide: true, monitor: true }, { x: 6, y: 7, wide: true, monitor: true }, { x: 8, y: 7, wide: true, monitor: true }, { x: 10, y: 7, wide: true, monitor: true },
  { x: 2, y: 9, wide: true, monitor: true }, { x: 4, y: 9, wide: true, monitor: true }, { x: 6, y: 9, wide: true, monitor: true }, { x: 8, y: 9, wide: true, monitor: true }, { x: 10, y: 9, wide: true, monitor: true },
]

/** Seats in Ruang Ketua & Sekretariat — the BPH department (owner/admin). */
export const KETUA_SEATS: Seat[] = [
  { x: 14, y: 3, wide: true, monitor: true }, { x: 17, y: 4, wide: true, monitor: true },
]

/** Seats in the Keuangan (Bendahara) room. */
export const KEUANGAN_SEATS: Seat[] = [
  { x: 14, y: 7, wide: true }, { x: 14, y: 9, wide: true },
]

/** Seats in the Humas & Media room. */
export const HUMAS_SEATS: Seat[] = [
  { x: 26, y: 7, wide: true, monitor: true }, { x: 26, y: 9, wide: true, monitor: true },
]

/** Seats in the Ruang Arsip (archive & documentation) — overflow for Sekretariat and anyone placed there. */
export const ARSIP_SEATS: Seat[] = [
  { x: 26, y: 3, wide: true, monitor: true }, { x: 28, y: 3, wide: true, monitor: true },
]

/** Audience chairs in the Aula & Panggung — Acara division and members without a department. */
export const AULA_SEATS: Seat[] = [
  { x: 22, y: 13 }, { x: 24, y: 13 },
  { x: 22, y: 14 }, { x: 24, y: 14 },
  { x: 22, y: 15 }, { x: 24, y: 15 },
]

/** Seats around the meeting table, used only while a meeting is actually live. */
export const MEETING_SEATS: Seat[] = [
  { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 11, y: 3 }, { x: 11, y: 4 },
  { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 8, y: 5 }, { x: 10, y: 5 },
]

export interface RoomLabel {
  text: string
  /** tile coords of the chip center */
  x: number
  y: number
}

/**
 * Labels sit on walls or over furniture — never over characters (characters
 * are 1.75 tiles tall, so row-2 seats are avoided everywhere).
 */
export const ROOM_LABELS: RoomLabel[] = [
  { text: 'Ruang Meeting', x: 10.1, y: 1.48 },
  { text: 'Ruang Ketua & Sekretariat', x: 15.5, y: 1.48 },
  { text: 'Pantry', x: 22.25, y: 1.48 },
  { text: 'Ruang Arsip', x: 27.5, y: 1.48 },
  { text: 'Workspace', x: 4.3, y: 11.5 },
  { text: 'Keuangan', x: 13.9, y: 11.5 },
  { text: 'Humas & Media', x: 28.2, y: 11.02 },
  { text: 'Project Board', x: 7, y: 12.55 },
  { text: 'Aula & Panggung', x: 25, y: 16.55 },
]

export function buildMap(): string[] {
  const grid: string[][] = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => '.'))

  const set = (x: number, y: number, ch: string) => {
    if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) grid[y]![x] = ch
  }
  const fillRect = (x0: number, y0: number, x1: number, y1: number, ch: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch)
  }

  // Exterior ground
  fillRect(0, 0, MAP_W - 1, 17, '.')
  fillRect(0, 18, MAP_W - 1, 18, 'S')
  fillRect(0, 19, MAP_W - 1, 19, 'R')

  // Building shell
  fillRect(1, 1, 30, 17, 'c')
  fillRect(1, 1, 30, 1, '#') // top wall (roof edge)
  fillRect(1, 17, 30, 17, '#') // bottom wall
  for (let y = 2; y <= 16; y++) {
    set(1, y, '|')
    set(30, y, '|')
  }
  // Entrance
  set(15, 17, 'E')
  set(16, 17, 'E')

  // Horizontal partitions
  fillRect(2, 6, 29, 6, '-')
  for (const [a, b] of [[6, 7], [15, 16], [21, 22], [27, 28]] as const) {
    fillRect(a, 6, b, 6, 'c')
  }
  fillRect(2, 11, 29, 11, '-')
  for (const [a, b] of [[6, 7], [15, 16], [21, 22]] as const) {
    fillRect(a, 11, b, 11, 'c')
  }

  // Vertical partitions — top band (meeting | ketua & sekretariat | pantry | arsip)
  fillRect(12, 2, 12, 5, '|')
  fillRect(19, 2, 19, 5, '|')
  fillRect(25, 2, 25, 5, '|')
  // Middle band (workspace | keuangan | corridor | humas & media)
  fillRect(12, 7, 12, 10, '|')
  fillRect(12, 8, 12, 9, 'g') // door workspace↔keuangan
  fillRect(18, 7, 18, 10, '|')
  fillRect(18, 8, 18, 9, 'g') // door keuangan↔corridor
  fillRect(24, 7, 24, 10, '|')
  fillRect(24, 8, 24, 9, 'c') // door corridor↔humas
  // Bottom band (board | entrance hall | aula & panggung)
  fillRect(12, 12, 12, 16, '|')
  fillRect(12, 13, 12, 14, 'c') // door board↔hall
  fillRect(19, 12, 19, 16, '|')
  fillRect(19, 13, 19, 14, 'c') // door hall↔aula

  // Floors
  fillRect(2, 2, 11, 5, 'm') // meeting
  fillRect(13, 2, 18, 5, 'm') // ketua & sekretariat
  fillRect(20, 2, 24, 5, 'm') // pantry
  fillRect(26, 2, 29, 5, 'c') // ruang arsip (light floor, neutral rug on top)
  fillRect(2, 7, 11, 10, 'g') // workspace
  fillRect(13, 7, 17, 10, 'm') // keuangan
  fillRect(19, 7, 23, 10, 'c') // corridor
  fillRect(25, 7, 29, 10, 'g') // humas & media
  fillRect(2, 12, 11, 16, 'm') // board room
  fillRect(13, 12, 18, 16, 'c') // entrance hall
  fillRect(20, 12, 29, 16, 'm') // aula & panggung
  // Entrance mat
  fillRect(15, 16, 16, 16, 'E')

  return grid.map((row) => row.join(''))
}

// ---- drawing primitives ----------------------------------------------------

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/** Filled panel with a 1px dark outline — the crisp pixel-art furniture base. */
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border: string = PAL.outline) {
  rect(ctx, x, y, w, h, border)
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill)
}

/**
 * Chunky 3/4 block: outlined top surface with a darker front face and a lit
 * top edge. This is the core furniture primitive in this scene.
 */
export function block3d(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  top: string,
  front: string,
  border: string = PAL.outline,
) {
  const faceH = Math.max(3, Math.min(6, Math.floor(h / 3)))
  rect(ctx, x, y, w, h, border)
  rect(ctx, x + 1, y + 1, w - 2, h - faceH - 1, top)
  rect(ctx, x + 1, y + h - faceH, w - 2, faceH - 1, front)
  rect(ctx, x + 1, y + 1, w - 2, 1, PAL.white)
  rect(ctx, x + 1, y + h - faceH, w - 2, 1, top)
}

/** Soft ground shadow blob (drawn under furniture/characters for depth). */
function groundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(32,36,47,0.18)'
  ctx.fillRect(x, y, w, 2)
  ctx.fillStyle = 'rgba(32,36,47,0.10)'
  ctx.fillRect(x + 1, y + 2, w - 2, 1)
}

/** Small outlined item: mugs, books, boxes, monitors. */
function item(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border: string = PAL.outline) {
  panel(ctx, x, y, w, h, fill, border)
}

/** Chunky monitor with a lit screen and a stand. */
function chunkyMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, screen: string = PAL.monitorScreen) {
  panel(ctx, x, y, 12, 9, PAL.monitor)
  rect(ctx, x + 2, y + 2, 8, 5, screen)
  rect(ctx, x + 3, y + 3, 3, 1, 'rgba(255,255,255,0.75)')
  rect(ctx, x + 9, y + 2, 1, 5, 'rgba(255,255,255,0.18)')
  rect(ctx, x + 5, y + 9, 2, 2, PAL.monitorStand)
  rect(ctx, x + 3, y + 11, 6, 1, PAL.monitorStand)
}

/** Mug with a tiny handle. */
export function drawMug(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  item(ctx, x, y, 5, 5, color)
  rect(ctx, x + 5, y + 1, 1, 2, PAL.outline)
  rect(ctx, x + 4, y + 1, 1, 1, color)
}

/** A tiny stack of paper documents. */
export function drawPapers(ctx: CanvasRenderingContext2D, x: number, y: number) {
  panel(ctx, x, y, 9, 6, PAL.white, '#8d95a6')
  rect(ctx, x + 2, y + 2, 5, 1, '#8d95a6')
  rect(ctx, x + 2, y + 4, 3, 1, '#8d95a6')
}

/** Carpet / runner with a contrasting border and fringe. */
export function drawRug(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, wTiles: number, hTiles: number, base: string, accent: string) {
  const x = tileX * TILE
  const y = tileY * TILE
  const w = wTiles * TILE
  const h = hTiles * TILE
  rect(ctx, x, y, w, h, accent)
  rect(ctx, x + 2, y + 2, w - 4, h - 4, base)
  rect(ctx, x + 4, y + 4, w - 8, 1, accent)
  rect(ctx, x + 4, y + h - 5, w - 8, 1, accent)
  // woven rows — subtle texture so large rugs don't read as flat floor
  ctx.save()
  ctx.globalAlpha = 0.22
  for (let yy = y + 9; yy < y + h - 7; yy += 7) rect(ctx, x + 4, yy, w - 8, 1, accent)
  ctx.restore()
  // corner tassels
  for (const [cx, cy] of [[x + 3, y + 3], [x + w - 6, y + 3], [x + 3, y + h - 6], [x + w - 6, y + h - 6]] as const) {
    rect(ctx, cx, cy, 3, 3, accent)
  }
}

// ---- top-down 3/4 wall treatment -------------------------------------------

/**
 * North wall face: the top band gets a visible 3/4 face (roof cap + wall
 * surface) instead of a flat top-down strip. Windows and framed art sit on
 * this wall, which makes the whole office read as a tilted box.
 */
export function drawNorthWall(ctx: CanvasRenderingContext2D) {
  const x0 = TILE
  const x1 = (MAP_W - 1) * TILE
  const w = x1 - x0
  // dark outline + wall face
  rect(ctx, x0 - 2, 0, w + 4, TILE * 2 + 2, PAL.outline)
  rect(ctx, x0, 2, w, TILE * 2, PAL.wallCream)
  // roof cap with shingles
  rect(ctx, x0 - 2, 0, w + 4, 7, PAL.roof)
  rect(ctx, x0 - 2, 0, w + 4, 2, PAL.wallTrim)
  rect(ctx, x0 - 2, 7, w + 4, 2, PAL.roofDark)
  for (let x = x0 + 4; x < x1; x += 24) {
    rect(ctx, x, 1, 2, 5, 'rgba(255,255,255,0.35)')
  }
  // vertical siding + baseboard
  for (let x = x0 + 8; x < x1; x += 32) {
    rect(ctx, x, 9, 1, 20, 'rgba(90,105,130,0.18)')
  }
  rect(ctx, x0, 29, w, 3, PAL.wallShade)
  rect(ctx, x0, 31, w, 1, PAL.outline)

  // windows along the wall, placed in the gaps between room-label plates
  for (const wx of [3, 10.1, 20.1, 28.8]) {
    const px = Math.round(wx * TILE)
    const py = 11
    rect(ctx, px, py - 1, 30, 14, PAL.outline)
    rect(ctx, px + 1, py, 28, 12, PAL.windowFrame)
    rect(ctx, px + 3, py + 2, 10, 8, PAL.window)
    rect(ctx, px + 15, py + 2, 10, 8, PAL.window)
    rect(ctx, px + 13, py + 2, 1, 8, PAL.windowFrame)
    rect(ctx, px + 4, py + 3, 3, 1, 'rgba(255,255,255,0.7)')
    rect(ctx, px + 16, py + 3, 3, 1, 'rgba(255,255,255,0.7)')
    rect(ctx, px - 1, py + 13, 32, 2, PAL.wallTrimDark)
  }

  // framed pictures + a wall-mounted AC unit, small 3/4 depth cues
  panel(ctx, 9 * TILE + 10, 10, 20, 13, '#e8e4d8', PAL.boardFrame)
  rect(ctx, 9 * TILE + 13, 13, 14, 6, PAL.sticky3)
  rect(ctx, 9 * TILE + 14, 14, 4, 2, PAL.sticky1)
  panel(ctx, 17 * TILE + 6, 10, 18, 12, '#e8e4d8', PAL.boardFrame)
  rect(ctx, 17 * TILE + 9, 13, 12, 5, PAL.sticky4)
  rect(ctx, 17 * TILE + 10, 14, 3, 2, PAL.white)
  item(ctx, 24 * TILE + 2, 10, 22, 9, PAL.white)
  rect(ctx, 24 * TILE + 4, 12, 18, 1, '#b6bdcc')
  rect(ctx, 24 * TILE + 4, 15, 12, 1, '#b6bdcc')
}

/** Door frame around a gap in an interior wall. */
export function drawDoorFrame(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, vertical: boolean) {
  const x = tileX * TILE
  const y = tileY * TILE
  if (vertical) {
    rect(ctx, x, y, 2, TILE, PAL.wallTrimDark)
    rect(ctx, x + TILE - 2, y, 2, TILE, PAL.wallTrimDark)
    rect(ctx, x + 2, y + TILE - 2, TILE - 4, 2, PAL.matFringe)
  } else {
    rect(ctx, x, y, TILE, 2, PAL.wallTrimDark)
    rect(ctx, x, y + TILE - 2, TILE, 2, PAL.wallTrimDark)
    rect(ctx, x + 2, y + 2, TILE - 4, TILE - 4, PAL.matFringe)
    rect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, PAL.mat)
  }
}

// ---- furniture ------------------------------------------------------------

export function drawDesk(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + TILE - 1, TILE * 2 - 4)
  block3d(ctx, px + 1, py + 1, TILE * 2 - 2, 13, PAL.wood, PAL.woodDark)
  rect(ctx, px + 3, py + 2, TILE * 2 - 6, 1, PAL.woodLight)
  // desk legs / modesty panel
  rect(ctx, px + 3, py + 13, 3, 3, PAL.woodDark)
  rect(ctx, px + TILE * 2 - 6, py + 13, 3, 3, PAL.woodDark)
  // dual monitors
  chunkyMonitor(ctx, px + 3, py + 2)
  chunkyMonitor(ctx, px + TILE + 5, py + 2, '#aee2ff')
  // keyboard + mouse + papers + mug
  item(ctx, px + 7, py + 10, 8, 3, PAL.chairDark)
  item(ctx, px + 17, py + 10, 3, 3, PAL.chairDark)
  drawPapers(ctx, px + 22, py + 9)
  drawMug(ctx, px + TILE + 1, py + 9, ['#c9573f', '#4f8ff7', '#3f9c50'][tileX % 3] ?? '#c9573f')
  // desk plant on some desks for life
  if (tileX % 4 === 0) {
    item(ctx, px + 1, py + 8, 4, 4, PAL.plantPot)
    rect(ctx, px + 1, py + 6, 4, 3, PAL.plantLeaf)
    rect(ctx, px + 2, py + 5, 2, 2, PAL.plantLeafDark)
  }
}

export function drawChairBack(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  // chair back (behind the sitter) with chunky outline + highlight
  panel(ctx, px + 4, py + 1, 10, 5, PAL.chair)
  rect(ctx, px + 5, py + 2, 8, 1, '#5a6478')
  rect(ctx, px + 4, py + 6, 10, 2, PAL.chairDark)
  // armrests
  rect(ctx, px + 2, py + 5, 2, 5, PAL.chairDark)
  rect(ctx, px + 14, py + 5, 2, 5, PAL.chairDark)
}

export function drawSideChairBack(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px + 1, py + 2, 4, 11, PAL.chair)
  rect(ctx, px + 2, py + 3, 1, 9, '#5a6478')
  rect(ctx, px + 5, py + 4, 3, 7, PAL.chairDark)
}

export function drawPlant(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 3, py + 15, 10)
  // pot with rim and highlight
  panel(ctx, px + 4, py + 10, 8, 5, PAL.plantPot)
  rect(ctx, px + 4, py + 11, 8, 1, '#dd8a60')
  rect(ctx, px + 5, py + 14, 6, 1, '#a95636')
  // layered canopy
  panel(ctx, px + 3, py + 3, 10, 7, PAL.plantLeaf)
  rect(ctx, px + 5, py + 1, 6, 3, PAL.plantLeaf)
  rect(ctx, px + 5, py + 5, 2, 4, PAL.plantLeafDark)
  rect(ctx, px + 9, py + 5, 2, 4, PAL.plantLeafDark)
  rect(ctx, px + 7, py + 2, 2, 2, '#79c884')
  rect(ctx, px + 4, py + 4, 1, 2, '#79c884')
}

/** Larger floor plant for room corners (fills two tiles vertically). */
export function drawPlantLarge(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + 30, 13)
  panel(ctx, px + 4, py + 18, 9, 10, PAL.plantPot)
  rect(ctx, px + 4, py + 19, 9, 2, '#dd8a60')
  panel(ctx, px + 1, py + 3, 14, 17, PAL.plantLeaf)
  rect(ctx, px + 4, py, 8, 4, PAL.plantLeaf)
  rect(ctx, px + 2, py + 8, 3, 9, PAL.plantLeafDark)
  rect(ctx, px + 12, py + 8, 3, 9, PAL.plantLeafDark)
  rect(ctx, px + 5, py + 2, 3, 4, '#79c884')
  rect(ctx, px + 10, py + 6, 2, 3, '#79c884')
  rect(ctx, px + 6, py + 12, 4, 2, PAL.plantLeafDark)
}

export function drawTree(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + 15, 12)
  rect(ctx, px + 6, py + 10, 4, 5, PAL.trunk)
  rect(ctx, px + 7, py + 10, 1, 5, '#a5754a')
  panel(ctx, px + 1, py + 1, 14, 9, PAL.tree)
  rect(ctx, px + 3, py + 2, 6, 2, '#66b96a')
  rect(ctx, px + 2, py + 7, 12, 2, PAL.treeDark)
  rect(ctx, px + 10, py + 3, 3, 3, PAL.treeDark)
  rect(ctx, px + 5, py + 3, 2, 2, '#8fd39a')
}

export function drawBush(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 3, py + 14, 10)
  panel(ctx, px + 3, py + 6, 10, 7, PAL.tree)
  rect(ctx, px + 5, py + 4, 6, 4, PAL.tree)
  rect(ctx, px + 6, py + 5, 3, 2, '#66b96a')
  rect(ctx, px + 3, py + 11, 10, 2, PAL.treeDark)
}

export function drawMeetingTable(ctx: CanvasRenderingContext2D) {
  const px = 3 * TILE
  const py = 3 * TILE
  groundShadow(ctx, px + 2, py + TILE * 2 - 2, TILE * 8 - 4)
  block3d(ctx, px, py + 1, TILE * 8, TILE * 2 - 4, PAL.wood, PAL.woodDark)
  rect(ctx, px + 2, py + 2, TILE * 8 - 4, 1, PAL.woodLight)
  ctx.fillStyle = 'rgba(140,95,55,0.35)'
  for (let i = 1; i < 8; i++) ctx.fillRect(px + i * 16, py + 6, 1, TILE * 2 - 10)
  // documents, mugs, laptop, water jug
  drawPapers(ctx, px + 14, py + 8)
  drawPapers(ctx, px + 104, py + 8)
  drawMug(ctx, px + 34, py + 8, '#c9573f')
  drawMug(ctx, px + 126, py + 8, '#4f8ff7')
  panel(ctx, px + 54, py + 6, 18, 12, '#3a4358')
  rect(ctx, px + 57, py + 8, 12, 7, PAL.monitorScreen)
  rect(ctx, px + 58, py + 9, 5, 1, 'rgba(255,255,255,0.7)')
  panel(ctx, px + 150, py + 6, 6, 10, '#bfe3ff', '#4a5872')
  rect(ctx, px + 151, py + 7, 4, 1, PAL.white)
  // presentation screen on the north wall
  panel(ctx, 4 * TILE + 4, TILE + 1, TILE * 6 - 8, TILE - 3, PAL.boardFrame)
  rect(ctx, 4 * TILE + 6, TILE + 3, TILE * 6 - 12, TILE - 7, PAL.white)
  rect(ctx, 4 * TILE + 8, TILE + 5, TILE * 3 - 8, 2, PAL.rug)
  rect(ctx, 4 * TILE + 8, TILE + 8, TILE * 2 - 6, 2, PAL.sticky4)
  rect(ctx, 4 * TILE + 9, TILE + 11, TILE - 4, 1, '#8d95a6')
}

/** Filing cabinet — arsip surat (Sekretariat) and laporan (Keuangan). */
export function drawCabinet(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + 15, 12)
  block3d(ctx, px + 2, py + 1, 12, 14, '#a7afc0', '#7d8698')
  for (const dy of [5, 9, 13]) {
    rect(ctx, px + 3, py + dy, 10, 1, '#6d7688')
    rect(ctx, px + 6, py + dy + 1, 4, 1, '#e6e9ee')
  }
  rect(ctx, px + 3, py + 2, 10, 1, '#d7dade')
}

/** Brankas kecil — kas divisi Keuangan. */
export function drawSafe(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + 15, 12)
  block3d(ctx, px + 2, py + 2, 12, 13, '#5b6472', '#454e5c')
  rect(ctx, px + 3, py + 3, 10, 1, '#8b94a5')
  panel(ctx, px + 4, py + 4, 8, 9, '#49525f', '#333b46')
  rect(ctx, px + 6, py + 6, 4, 4, '#c3cdda')
  rect(ctx, px + 7, py + 7, 2, 2, '#5b6472')
  rect(ctx, px + 11, py + 7, 1, 1, '#c3cdda')
}

/** Rak gudang berisi kardus perlengkapan. */
export function drawStorageShelf(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, tiles: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  block3d(ctx, px, py + 1, TILE * tiles, TILE - 2, '#a5754a', '#7a5234')
  for (let i = 0; i < tiles * 2; i++) {
    const bx = px + 3 + i * 12
    const by = py + (i % 2 === 0 ? 2 : 10)
    const color = i % 3 === 0 ? '#e0b07c' : '#d0a070'
    item(ctx, bx, by, 9, 5, color, '#8a5f3c')
    rect(ctx, bx + 4, by + 1, 1, 4, '#a5754a')
    rect(ctx, bx + 1, by + 2, 7, 1, '#a5754a')
  }
}

/** Rol spanduk berdiri di sudut gudang. */
export function drawBannerRolls(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  for (const [dx, color] of [[3, '#4f8ff7'], [7, '#c9573f'], [11, '#3f9c50']] as const) {
    panel(ctx, px + dx, py + 2, 4, 13, color)
    rect(ctx, px + dx + 1, py + 3, 1, 11, 'rgba(255,255,255,0.4)')
    rect(ctx, px + dx + 2, py + 4, 1, 2, PAL.white)
  }
}

/** Tumpukan kardus perlengkapan event. */
export function drawBoxStack(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + 15, 12)
  block3d(ctx, px + 2, py + 8, 12, 7, '#d0a070', '#a5754a', '#8a5f3c')
  rect(ctx, px + 7, py + 9, 1, 6, '#8a5f3c')
  block3d(ctx, px + 4, py + 3, 10, 6, '#e0b07c', '#b5825a', '#8a5f3c')
  rect(ctx, px + 8, py + 4, 1, 5, '#8a5f3c')
}

/** Meja ketua — lebih besar, dengan monitor dan dokumen. */
export function drawKetuaDesk(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + TILE - 1, TILE * 2 - 4)
  block3d(ctx, px + 1, py + 1, TILE * 2 - 2, 13, PAL.wood, PAL.woodDark)
  rect(ctx, px + 3, py + 2, TILE * 2 - 6, 1, PAL.woodLight)
  chunkyMonitor(ctx, px + 4, py + 2)
  drawPapers(ctx, px + 19, py + 4)
  drawMug(ctx, px + 27, py + 10, '#3f9c50')
  // nameplate
  item(ctx, px + 16, py + 10, 10, 3, PAL.white, '#8d95a6')
  rect(ctx, px + 18, py + 11, 6, 1, '#8d95a6')
}

/** Meja kas bendahara — dokumen, kalkulator, dan buku kas. */
export function drawKasDesk(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + TILE - 1, TILE * 2 - 4)
  block3d(ctx, px + 1, py + 1, TILE * 2 - 2, 13, PAL.wood, PAL.woodDark)
  rect(ctx, px + 3, py + 2, TILE * 2 - 6, 1, PAL.woodLight)
  // open ledger
  panel(ctx, px + 3, py + 4, 10, 7, PAL.white, '#8d95a6')
  rect(ctx, px + 4, py + 6, 3, 1, '#8d95a6')
  rect(ctx, px + 4, py + 8, 3, 1, '#8d95a6')
  rect(ctx, px + 8, py + 4, 1, 7, '#c2c6cd')
  // calculator
  panel(ctx, px + 17, py + 4, 9, 6, '#3a4358')
  rect(ctx, px + 18, py + 5, 7, 2, '#7fc4ff')
  // coins
  item(ctx, px + 18, py + 11, 3, 2, PAL.sticky1, '#a8761c')
  item(ctx, px + 22, py + 11, 3, 2, PAL.sticky1, '#a8761c')
}

/** Kamera di tripod — peralatan dokumentasi Humas & Media. */
export function drawCamera(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 3, py + 15, 10)
  // tripod legs
  rect(ctx, px + 7, py + 8, 2, 7, '#4a5872')
  rect(ctx, px + 4, py + 13, 2, 2, '#4a5872')
  rect(ctx, px + 10, py + 13, 2, 2, '#4a5872')
  rect(ctx, px + 5, py + 11, 2, 2, '#4a5872')
  rect(ctx, px + 9, py + 11, 2, 2, '#4a5872')
  // camera body + lens
  panel(ctx, px + 3, py + 2, 10, 6, '#252c40')
  rect(ctx, px + 5, py + 3, 5, 4, '#7fc4ff')
  rect(ctx, px + 6, py + 4, 2, 1, PAL.white)
  rect(ctx, px + 4, py + 1, 3, 1, '#252c40')
}

/** Papan media/poster — dinding Humas & Media. */
export function drawMediaBoard(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px + 1, py + 1, TILE * 2 - 2, TILE * 2 - 2, PAL.boardFrame)
  rect(ctx, px + 3, py + 3, TILE * 2 - 6, TILE * 2 - 6, PAL.boardWhite)
  panel(ctx, px + 4, py + 4, 9, 8, PAL.sticky3, '#4a5872')
  panel(ctx, px + 15, py + 4, 9, 8, PAL.sticky2, '#4a5872')
  panel(ctx, px + 4, py + 15, 9, 8, PAL.sticky1, '#4a5872')
  panel(ctx, px + 15, py + 15, 9, 8, PAL.sticky4, '#4a5872')
}

/** Panggung event — platform kayu dengan tirai merah dan lampu. */
export function drawStage(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  const w = TILE * 4
  const h = TILE * 2
  groundShadow(ctx, px, py + h - 2, w)
  block3d(ctx, px, py + 1, w, h - 2, PAL.wood, PAL.woodDark)
  rect(ctx, px + 1, py + 2, w - 2, 1, PAL.woodLight)
  ctx.fillStyle = 'rgba(140,95,55,0.35)'
  for (let i = 1; i < 8; i++) ctx.fillRect(px + i * 8, py + 5, 1, h - 8)
  // front skirt + steps
  rect(ctx, px + 1, py + h - 6, w - 2, 4, PAL.woodDark)
  rect(ctx, px + w / 2 - 6, py + h - 2, 12, 2, PAL.woodLight)
  // curtains with folds
  for (const cx of [0, w - 14]) {
    panel(ctx, px + cx, py, 14, 13, '#c9573f', '#8a3d2e')
    rect(ctx, px + cx + 3, py + 2, 2, 10, '#e07a5f')
    rect(ctx, px + cx + 8, py + 2, 2, 10, '#e07a5f')
  }
  // stage footlights (decorative, not data)
  for (const lx of [8, 20, 40, 52]) {
    rect(ctx, px + lx, py + h - 4, 3, 2, PAL.lamp)
    rect(ctx, px + lx, py + h - 6, 3, 1, '#a8761c')
  }
}

/** Lampu sorot panggung (dipakai pada layer statis). */
export function drawStageLight(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  rect(ctx, px + 6, py + 2, 4, 2, PAL.chairDark)
  rect(ctx, px + 3, py + 4, 10, 2, PAL.chairDark)
  rect(ctx, px + 4, py + 6, 8, 3, '#4a5872')
  rect(ctx, px + 6, py + 8, 4, 3, PAL.lamp)
}

/** Papan pengumuman — gabus dengan kertas pengumuman, berkaki. */
export function drawAnnouncementBoard(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 1, py + 15, TILE * 2 - 2)
  panel(ctx, px + 1, py + 1, TILE * 2 - 2, TILE - 4, '#a5754a')
  rect(ctx, px + 3, py + 3, TILE * 2 - 6, TILE - 8, '#d9b98c')
  for (const dx of [4, 12, 20]) {
    panel(ctx, px + dx, py + 4, 6, 7, PAL.white, '#8d95a6')
    rect(ctx, px + dx + 1, py + 6, 4, 1, '#8d95a6')
  }
  rect(ctx, px + 3, py + 13, 2, 3, PAL.woodDark)
  rect(ctx, px + TILE * 2 - 5, py + 13, 2, 3, PAL.woodDark)
}

export function drawCoffeeTable(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 3, py + 13, TILE * 2 - 6)
  block3d(ctx, px + 3, py + 4, TILE * 2 - 6, 9, PAL.wood, PAL.woodDark)
  rect(ctx, px + 4, py + 5, TILE * 2 - 8, 1, PAL.woodLight)
}

export function drawCounter(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, tiles: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  block3d(ctx, px, py + 1, TILE * tiles, TILE, PAL.woodLight, PAL.wood)
  rect(ctx, px + 1, py + 2, TILE * tiles - 2, 1, PAL.white)
  // sink with faucet
  panel(ctx, px + TILE + 4, py + 4, 10, 6, '#9aa8bd')
  rect(ctx, px + TILE + 5, py + 5, 8, 4, '#7fc4ff')
  rect(ctx, px + TILE + 8, py + 2, 1, 2, PAL.windowFrame)
  rect(ctx, px + TILE + 7, py + 2, 3, 1, PAL.windowFrame)
  // coffee machine
  panel(ctx, px + TILE * 3 + 1, py - 3, 11, 11, PAL.monitor)
  rect(ctx, px + TILE * 3 + 3, py - 1, 7, 3, PAL.ledOn)
  rect(ctx, px + TILE * 3 + 4, py + 6, 5, 3, PAL.sticky2)
  rect(ctx, px + TILE * 3 + 3, py + 2, 7, 1, '#4a5872')
}

export function drawFridge(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 3, py + 15, 12)
  block3d(ctx, px + 3, py, 11, TILE * 2 - 1, PAL.white, '#dfe3e8')
  rect(ctx, px + 4, py + 1, 9, 1, PAL.white)
  rect(ctx, px + 3, py + 8, 11, 1, '#c2c6cd')
  rect(ctx, px + 12, py + 4, 2, 3, PAL.windowFrame)
  rect(ctx, px + 12, py + 10, 2, 3, PAL.windowFrame)
  // magnets
  rect(ctx, px + 6, py + 3, 2, 2, PAL.sticky1)
  rect(ctx, px + 9, py + 5, 2, 2, PAL.sticky3)
}

export function drawBoard(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, stickies: string[]) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px, py, TILE * 4, TILE * 2, PAL.boardFrame)
  rect(ctx, px + 2, py + 2, TILE * 4 - 4, TILE * 2 - 4, PAL.boardWhite)
  rect(ctx, px + 2, py + 2, TILE * 4 - 4, 5, '#e4dbc4')
  rect(ctx, px + 4, py + 4, 20, 2, '#a5754a')
  rect(ctx, px + 44, py + 4, 14, 2, '#a5754a')
  stickies.forEach((color, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    panel(ctx, px + 5 + col * 14, py + 9 + row * 12, 8, 7, color, '#8d95a6')
  })
}

export function drawBookshelf(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, tiles: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  block3d(ctx, px, py + 1, TILE * tiles, TILE - 2, '#a5754a', '#7a5234')
  for (let i = 0; i < tiles * 3; i++) {
    const colors = [PAL.sticky1, PAL.sticky3, PAL.sticky2, PAL.sticky4]
    const bx = px + 3 + i * 8
    ctx.fillStyle = colors[i % colors.length] ?? PAL.sticky1
    ctx.fillRect(bx, py + 3, 5, 9)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(bx, py + 3, 1, 9)
    ctx.fillStyle = '#8a5f3c'
    ctx.fillRect(bx + 1, py + 5, 3, 1)
  }
}

export function drawReceptionDesk(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 1, py + TILE - 1, TILE * 2 - 2)
  block3d(ctx, px, py + 2, TILE * 2, TILE - 4, PAL.wood, PAL.woodDark)
  rect(ctx, px + 1, py + 3, TILE * 2 - 2, 1, PAL.woodLight)
  chunkyMonitor(ctx, px + 5, py + 3)
  // service bell + paper
  item(ctx, px + 22, py + 8, 4, 3, PAL.sticky1, '#a8761c')
  rect(ctx, px + 23, py + 7, 2, 1, '#a8761c')
  drawPapers(ctx, px + 3, py + 9)
}

export function drawMat(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  rect(ctx, px, py + 3, TILE, TILE - 6, PAL.mat)
  rect(ctx, px, py + 3, TILE, 2, PAL.matFringe)
  rect(ctx, px, py + TILE - 4, TILE, 1, PAL.matFringe)
  rect(ctx, px + 2, py + 6, TILE - 4, 1, '#e07a5f')
}

export function drawEntranceDoor(ctx: CanvasRenderingContext2D) {
  const px = 15 * TILE
  const py = 17 * TILE
  // awning
  rect(ctx, px - 6, py + 1, TILE * 2 + 12, 3, PAL.outline)
  rect(ctx, px - 5, py + 2, TILE * 2 + 10, 2, '#c9573f')
  rect(ctx, px - 3, py + 4, TILE * 2 + 6, 1, '#8a3d2e')
  panel(ctx, px + 1, py + 4, TILE * 2 - 2, TILE - 4, PAL.windowFrame)
  rect(ctx, px + 3, py + 6, TILE - 4, TILE - 8, PAL.window)
  rect(ctx, px + TILE + 3, py + 6, TILE - 6, TILE - 8, PAL.window)
  rect(ctx, px + 3, py + 10, TILE - 4, 1, PAL.windowFrame)
  rect(ctx, px + TILE + 3, py + 10, TILE - 6, 1, PAL.windowFrame)
  rect(ctx, px + TILE - 1, py + 6, 2, 6, PAL.wallTrimDark)
  // push bars
  rect(ctx, px + 5, py + 11, TILE - 8, 1, '#d7dade')
  rect(ctx, px + TILE + 5, py + 11, TILE - 8, 1, '#d7dade')
}

export function drawWindowsBottom(ctx: CanvasRenderingContext2D) {
  for (const x of [3, 8, 21, 26]) {
    const px = x * TILE
    const py = 17 * TILE
    panel(ctx, px + 1, py + 3, 14, 11, PAL.windowFrame)
    rect(ctx, px + 2, py + 4, 5, 9, PAL.window)
    rect(ctx, px + 8, py + 4, 5, 9, PAL.window)
    rect(ctx, px + 7, py + 4, 1, 9, PAL.windowFrame)
    rect(ctx, px + 3, py + 5, 2, 1, 'rgba(255,255,255,0.8)')
    rect(ctx, px + 1, py + 14, 14, 1, PAL.wallTrimDark)
  }
}

export function drawWaterCooler(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 4, py + 15, 9)
  item(ctx, px + 5, py + 1, 6, 5, PAL.monitorScreen)
  rect(ctx, px + 6, py + 2, 2, 1, PAL.white)
  block3d(ctx, px + 4, py + 6, 8, 9, PAL.white, '#dfe3e8')
  rect(ctx, px + 5, py + 9, 2, 3, PAL.sticky3)
  rect(ctx, px + 9, py + 9, 2, 3, PAL.sticky2)
}

/** Tempat sampah kecil — detail koridor. */
export function drawTrashBin(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 4, py + 15, 9)
  block3d(ctx, px + 4, py + 5, 8, 10, '#9aa3b4', '#7d8698')
  rect(ctx, px + 4, py + 6, 8, 1, '#b6bdcc')
  rect(ctx, px + 6, py + 9, 1, 4, '#6d7688')
  rect(ctx, px + 9, py + 9, 1, 4, '#6d7688')
}

/** Bangku tunggu di aula masuk. */
export function drawBench(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 1, py + 14, TILE * 2 - 2)
  block3d(ctx, px + 1, py + 3, TILE * 2 - 2, 8, PAL.wood, PAL.woodDark)
  rect(ctx, px + 2, py + 4, TILE * 2 - 4, 1, PAL.woodLight)
  rect(ctx, px + 3, py + 11, 2, 4, PAL.woodDark)
  rect(ctx, px + TILE * 2 - 5, py + 11, 2, 4, PAL.woodDark)
}

/** Podium pembicara di panggung. */
export function drawPodium(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  block3d(ctx, px + 4, py + 4, 8, 10, '#a5754a', '#7a5234')
  rect(ctx, px + 5, py + 5, 6, 1, '#c08a5c')
  panel(ctx, px + 2, py + 1, 12, 4, '#8a5f3c')
  rect(ctx, px + 5, py + 2, 6, 1, '#e8e4d8')
  rect(ctx, px + 7, py + 3, 2, 1, '#8d95a6')
}

/** Plang nama kantor di samping pintu masuk. */
export function drawSign(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px, py + 1, TILE * 2, 13, '#2e3a52')
  rect(ctx, px + 1, py + 2, TILE * 2 - 2, 1, '#4a5872')
  // pixel "P" mark
  rect(ctx, px + 5, py + 4, 3, 7, '#ffffff')
  rect(ctx, px + 8, py + 4, 3, 2, '#ffffff')
  rect(ctx, px + 8, py + 6, 2, 2, '#ffffff')
  // brand dot
  rect(ctx, px + 21, py + 5, 5, 5, '#1d9e74')
  rect(ctx, px + 22, py + 6, 3, 3, '#75e0b3')
}

/** Sapu di sudut gudang. */
export function drawBroom(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  rect(ctx, px + 7, py + 2, 2, 9, '#b9835a')
  panel(ctx, px + 4, py + 11, 8, 4, '#d9b98c', '#8a5f3c')
  for (const dx of [5, 7, 9]) {
    rect(ctx, px + dx, py + 12, 1, 2, '#8a5f3c')
  }
}

/** Jam dinding. */
export function drawWallClock(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px + 3, py + 2, 10, 10, PAL.white)
  rect(ctx, px + 4, py + 3, 8, 1, '#e9edf4')
  // 12/3/6/9 ticks
  rect(ctx, px + 7, py + 4, 2, 1, '#8d95a6')
  rect(ctx, px + 7, py + 10, 2, 1, '#8d95a6')
  rect(ctx, px + 4, py + 7, 1, 2, '#8d95a6')
  rect(ctx, px + 11, py + 7, 1, 2, '#8d95a6')
  rect(ctx, px + 7, py + 6, 1, 3, '#26314b')
  rect(ctx, px + 8, py + 8, 2, 1, '#26314b')
}

/** Skuter parkir di tepi jalan (top-down). */
export function drawScooter(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  rect(ctx, px + 3, py + 12, 10, 2, 'rgba(32,36,47,0.2)')
  // wheels
  rect(ctx, px + 5, py + 1, 6, 3, '#26314b')
  rect(ctx, px + 5, py + 12, 6, 3, '#26314b')
  // deck + seat
  panel(ctx, px + 4, py + 4, 8, 8, '#c9454f')
  rect(ctx, px + 5, py + 7, 6, 2, '#3a4358')
  rect(ctx, px + 5, py + 5, 2, 1, '#e07a5f')
  // handlebar
  rect(ctx, px + 3, py + 2, 10, 1, '#3a4358')
  rect(ctx, px + 3, py + 1, 1, 2, '#3a4358')
  rect(ctx, px + 12, py + 1, 1, 2, '#3a4358')
}

/** Rambu parkir kecil di trotoar. */
export function drawParkingSign(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px + 4, py + 1, 8, 10, '#4f8ff7')
  rect(ctx, px + 7, py + 3, 2, 6, '#ffffff')
  rect(ctx, px + 9, py + 3, 1, 2, '#ffffff')
  rect(ctx, px + 9, py + 5, 1, 2, '#ffffff')
  rect(ctx, px + 7, py + 11, 2, 4, '#8d95a6')
}

/** Kucing kantor — ekor beranimasi dua frame. */
export function drawCat(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, tailUp: boolean) {
  const px = tileX * TILE
  const py = tileY * TILE
  groundShadow(ctx, px + 2, py + 12, 11)
  if (tailUp) {
    panel(ctx, px + 1, py + 1, 2, 7, '#e8b06a', '#8a5f3c')
    rect(ctx, px + 2, py + 1, 1, 2, '#f6d29b')
  } else {
    panel(ctx, px, py + 7, 4, 2, '#e8b06a', '#8a5f3c')
  }
  panel(ctx, px + 2, py + 6, 11, 5, '#e8b06a', '#8a5f3c')
  panel(ctx, px + 9, py + 2, 6, 6, '#e8b06a', '#8a5f3c')
  // ears
  rect(ctx, px + 10, py + 1, 1, 2, '#8a5f3c')
  rect(ctx, px + 13, py + 1, 1, 2, '#8a5f3c')
  // stripes + face
  rect(ctx, px + 4, py + 7, 1, 3, '#c98a4b')
  rect(ctx, px + 6, py + 7, 1, 3, '#c98a4b')
  rect(ctx, px + 11, py + 4, 1, 1, '#26314b')
  rect(ctx, px + 13, py + 4, 1, 1, '#26314b')
  rect(ctx, px + 12, py + 6, 1, 1, '#c98a4b')
}

/** Layar TV koridor (bingkai saja — teksnya disematkan via DOM agar tajam). */
export function drawTVScreen(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px + 1, py + 1, TILE * 2 - 2, 14, '#39415a')
  rect(ctx, px + 2, py + 2, TILE * 2 - 4, 12, '#0d1117')
  rect(ctx, px + 3, py + 3, TILE * 2 - 6, 1, '#39415a')
  rect(ctx, px + TILE - 4, py + 16, 3, 1, '#39415a')
}

/** Wall poster for the corridor / media room. */
export function drawWallPoster(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, color: string) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px + 1, py + 1, TILE * 2 - 2, TILE - 2, '#e8e4d8', PAL.boardFrame)
  rect(ctx, px + 4, py + 4, TILE * 2 - 8, TILE - 10, color)
  rect(ctx, px + 5, py + 5, 4, 2, PAL.white)
  rect(ctx, px + 5, py + 8, 6, 1, 'rgba(255,255,255,0.7)')
}

/** Small shelf with jars above the pantry counter. */
export function drawPantryShelf(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px, py + 2, TILE * 3, 3, PAL.woodDark)
  for (const [dx, color] of [[3, '#e8b06a'], [9, '#c9573f'], [15, '#4f8ff7'], [21, '#3f9c50'], [27, '#ffd166']] as const) {
    panel(ctx, px + dx, py + 6, 4, 7, color)
    rect(ctx, px + dx + 1, py + 7, 2, 1, 'rgba(255,255,255,0.6)')
  }
}

/** Whiteboard with a few real-looking scribbles (decorative). */
export function drawWhiteboard(ctx: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const px = tileX * TILE
  const py = tileY * TILE
  panel(ctx, px + 1, py + 1, TILE * 3 - 2, TILE * 2 - 2, '#e6e9ee', '#8d95a6')
  rect(ctx, px + 4, py + 4, 14, 1, '#4f8ff7')
  rect(ctx, px + 4, py + 7, 10, 1, '#8d95a6')
  rect(ctx, px + 4, py + 10, 16, 1, '#8d95a6')
  rect(ctx, px + 4, py + 13, 8, 1, '#c9573f')
  rect(ctx, px + 4, py + 16, 12, 1, '#8d95a6')
}

/** Ceiling pendant lamp — drawn below the wall face, glow handled by the caller. */
export function drawPendantLamp(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, lit: boolean) {
  const px = tileX * TILE
  const py = tileY * TILE
  rect(ctx, px + 7, py, 2, 4, PAL.outline)
  panel(ctx, px + 4, py + 4, 8, 5, lit ? PAL.lamp : '#e6e9ee', '#8d95a6')
  if (lit) {
    rect(ctx, px + 5, py + 5, 6, 1, '#fff3c4')
  }
}

// ---- walking (pathfinding) -------------------------------------------------

/** Tiles a character may occupy. Walls are never walkable. */
export function isWalkable(tile: string | undefined): boolean {
  return tile === 'm' || tile === 'g' || tile === 'c' || tile === 'E'
}

/**
 * BFS path over floor tiles (4-directional). Returns tile waypoints from the
 * step AFTER the start up to the destination, or null when unreachable.
 * Characters therefore walk through doorways, never through walls.
 */
export function findPath(
  grid: string[],
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] | null {
  if (from.x === to.x && from.y === to.y) return []
  if (!isWalkable(grid[to.y]?.[to.x]) || !isWalkable(grid[from.y]?.[from.x])) return null
  const key = (x: number, y: number) => y * MAP_W + x
  const prev = new Map<number, number>()
  const queue: number[] = [key(from.x, from.y)]
  prev.set(queue[0]!, -1)
  while (queue.length > 0) {
    const cur = queue.shift()!
    const cx = cur % MAP_W
    const cy = Math.floor(cur / MAP_W)
    if (cx === to.x && cy === to.y) break
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue
      const nk = key(nx, ny)
      if (prev.has(nk) || !isWalkable(grid[ny]?.[nx])) continue
      prev.set(nk, cur)
      queue.push(nk)
    }
  }
  if (!prev.has(key(to.x, to.y))) return null
  const path: { x: number; y: number }[] = []
  let cur = key(to.x, to.y)
  while (cur !== key(from.x, from.y) && cur !== -1) {
    path.push({ x: cur % MAP_W, y: Math.floor(cur / MAP_W) })
    cur = prev.get(cur) ?? -1
  }
  return path.reverse()
}
