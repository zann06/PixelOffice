import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SceneViewModel, SceneMemberVM } from './sceneViewModel'
import {
  CHAR_H,
  CHAR_W,
  MAP_H,
  MAP_W,
  PAL,
  SCENE_H,
  SCENE_W,
  TILE,
  characterPalette,
  drawBadgeBubble,
  drawCharacter,
  hashIndex,
  shadeHex,
  type CharacterPose,
} from './sprites'
import { drawPixelText, drawPlaque, measurePixelText } from './pixelFont'
import {
  ARSIP_SEATS,
  AULA_SEATS,
  KEUANGAN_SEATS,
  KETUA_SEATS,
  HUMAS_SEATS,
  MEETING_SEATS,
  WORKSPACE_SEATS,
  buildMap,
  drawAnnouncementBoard,
  drawBench,
  drawBoard,
  drawBookshelf,
  drawBush,
  drawCamera,
  drawCabinet,
  drawCat,
  drawChairBack,
  drawCoffeeTable,
  drawCounter,
  drawDesk,
  drawDoorFrame,
  drawEntranceDoor,
  drawFridge,
  drawKasDesk,
  drawKetuaDesk,
  drawMat,
  drawMediaBoard,
  drawMeetingTable,
  drawMug,
  drawNorthWall,
  drawPantryShelf,
  drawPapers,
  drawParkingSign,
  drawPendantLamp,
  drawPlant,
  drawPlantLarge,
  drawPodium,
  drawReceptionDesk,
  drawRug,
  drawSafe,
  drawSideChairBack,
  drawSign,
  drawStage,
  drawStageLight,
  drawTVScreen,
  drawTrashBin,
  drawTree,
  drawWallClock,
  drawWallPoster,
  drawWaterCooler,
  drawWhiteboard,
  drawWindowsBottom,
  findPath,
  ROOM_LABELS,
} from './officeMap'
import { ACTIVITY_LABEL } from './sceneLabels'
import { dayLight, fractionalHour, type DayLight, type DayPhase } from './dayCycle'
import type { Route } from '../../app/router'

/**
 * The pixel office scene (docs/REFERENCE.md scene rules):
 * - Canvas renders an ORIGINAL pixel-art office in a top-down 3/4 view; the
 *   DOM overlay adds room labels and a real <button> per character so keyboard
 *   users can select members without pointer precision (the roster list
 *   mirrors the same data).
 * - Canvas itself is decorative (aria-hidden); a role="img" summary describes
 *   the scene for screen readers.
 * - Animation loop pauses when the scene is offscreen or motion is disabled.
 * - Every animation below is either decoration (steam, blinking) or derived
 *   from saved data (typing/screen glow only for saved in-progress tasks).
 */

/** Static walkable grid for BFS walking (the floor plan never changes). */
const WALK_GRID = buildMap()

const STICKY_BY_STATUS: Record<string, string> = {
  planned: PAL.sticky1,
  active: PAL.sticky3,
  blocked: PAL.sticky2,
  completed: PAL.sticky4,
}

function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return Math.abs(h ^ (h >> 16))
}

/**
 * Rendering is done at an INTEGER multiple of device pixels (see the layout
 * effect in the component): every art pixel is an exact square, there is no
 * CSS stretching, and image smoothing is always off.
 */
const MAX_SCALE = 8


/**
 * Static layer (floor, walls, furniture, ambience) — re-rendered only when the
 * data-driven board/pins or the day phase change.
 */
export function renderStaticLayer(boardStickies: string[], pins: { blocked: number; events: number }, phase: DayPhase, scale: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = SCENE_W * scale
  canvas.height = SCENE_H * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  const map = buildMap()
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const tile = map[y]?.[x] ?? '.'
      const px = x * TILE
      const py = y * TILE
      switch (tile) {
        case '.': {
          ctx.fillStyle = PAL.grass
          ctx.fillRect(px, py, TILE, TILE)
          if ((x >> 1) % 2 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)'
            ctx.fillRect(px, py, TILE, TILE)
          }
          if (hash2(x, y) % 5 === 0) {
            ctx.fillStyle = PAL.grassTuft
            ctx.fillRect(px + 4 + (hash2(x, y) % 6), py + 4 + (hash2(x + 1, y) % 6), 3, 2)
            ctx.fillRect(px + 9, py + 10, 2, 2)
          }
          // scattered flowers for a lively lawn
          if (hash2(x * 3 + 1, y * 5 + 2) % 9 === 0) {
            const fx = px + 3 + (hash2(x, y * 2) % 9)
            const fy = py + 3 + (hash2(y, x * 2) % 9)
            const petal = ['#ffffff', '#ffd166', '#f2a3c0'][hash2(x + 3, y + 7) % 3] ?? '#ffffff'
            ctx.fillStyle = petal
            ctx.fillRect(fx, fy, 1, 3)
            ctx.fillRect(fx - 1, fy + 1, 3, 1)
            ctx.fillStyle = '#e8973f'
            ctx.fillRect(fx, fy + 1, 1, 1)
          }
          break
        }
        case 'S':
          ctx.fillStyle = PAL.sidewalk
          ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = '#c6ccd6'
          ctx.fillRect(px + 7, py, 1, TILE)
          ctx.fillStyle = PAL.sidewalkEdge
          ctx.fillRect(px, py + TILE - 1, TILE, 1)
          break
        case 'R':
          ctx.fillStyle = PAL.road
          ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = 'rgba(35,40,52,0.25)'
          ctx.fillRect(px, py, TILE, 2)
          if (x % 2 === 0) {
            ctx.fillStyle = PAL.roadLine
            ctx.fillRect(px + 3, py + 7, 10, 2)
          }
          if (x === 15 || x === 16) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)'
            ctx.fillRect(px + 5, py + 1, 6, 14)
          }
          break
        case '#': {
          // roof band with shingle texture
          ctx.fillStyle = PAL.roof
          ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = 'rgba(90,105,130,0.35)'
          for (let ry = 3; ry < 12; ry += 4) ctx.fillRect(px, py + ry, TILE, 1)
          if (hash2(x, y) % 3 === 0) ctx.fillRect(px + 2 + (hash2(x, y) % 10), py + 3, 1, 4)
          ctx.fillStyle = PAL.roofDark
          ctx.fillRect(px, py + TILE - 4, TILE, 4)
          ctx.fillStyle = PAL.wallTrim
          ctx.fillRect(px, py, TILE, 2)
          break
        }
        case 'E':
          ctx.fillStyle = PAL.corridor
          ctx.fillRect(px, py, TILE, TILE)
          drawMat(ctx, x, y)
          break
        case 'm': {
          // wood planks: horizontal seams + staggered vertical joints + tint variation
          ctx.fillStyle = PAL.floorWood
          ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = 'rgba(150,100,55,0.30)'
          for (let ry = 1; ry < 4; ry++) ctx.fillRect(px, py + ry * 4, TILE, 1)
          ctx.fillRect(px + 2 + (hash2(x, y) % 11), py, 1, 4)
          if (hash2(x + 7, y) % 4 === 0) {
            ctx.fillStyle = 'rgba(150,100,55,0.10)'
            ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2)
          }
          // subtle plank knot
          if (hash2(x * 5, y * 3) % 17 === 0) {
            ctx.fillStyle = 'rgba(120,80,45,0.28)'
            ctx.fillRect(px + 4 + (hash2(x, y) % 6), py + 5, 2, 1)
          }
          break
        }
        case 'g': {
          // soft two-tone tiles with grid
          ctx.fillStyle = PAL.floorGray
          ctx.fillRect(px, py, TILE, TILE)
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = 'rgba(120,135,160,0.14)'
            ctx.fillRect(px, py, TILE, TILE)
          }
          ctx.fillStyle = 'rgba(120,135,160,0.45)'
          ctx.fillRect(px, py + TILE - 1, TILE, 1)
          ctx.fillRect(px + TILE - 1, py, 1, TILE)
          break
        }
        case 'c': {
          // warm corridor: uniform ceramic joints + faint speckle
          ctx.fillStyle = PAL.corridor
          ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = 'rgba(180,160,120,0.28)'
          ctx.fillRect(px, py, TILE, 1)
          ctx.fillRect(px, py, 1, TILE)
          ctx.fillStyle = 'rgba(180,160,120,0.5)'
          ctx.fillRect(px, py + TILE - 1, TILE, 1)
          if (hash2(x, y) % 5 === 0) {
            ctx.fillStyle = 'rgba(150,130,95,0.28)'
            ctx.fillRect(px + 2 + (hash2(x, y) % 10), py + 2 + (hash2(y, x) % 10), 1, 1)
          }
          break
        }
        case '|':
          ctx.fillStyle = PAL.wallCream
          ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(px, py, 1, TILE)
          ctx.fillStyle = PAL.wallShade
          ctx.fillRect(px + TILE - 4, py, 4, TILE)
          ctx.fillStyle = 'rgba(90,105,130,0.3)'
          ctx.fillRect(px + TILE - 1, py, 1, TILE)
          break
        case '-':
          ctx.fillStyle = PAL.wallCream
          ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(px, py, TILE, 1)
          ctx.fillStyle = PAL.wallShade
          ctx.fillRect(px, py + TILE - 6, TILE, 6)
          ctx.fillStyle = 'rgba(90,105,130,0.3)'
          ctx.fillRect(px, py + TILE - 1, TILE, 1)
          break
      }
    }
  }

  // Soft shadows cast by walls onto floors — 16-bit depth cue (docs/REFERENCE.md)
  const isFloor = (t?: string) => t === 'm' || t === 'g' || t === 'c' || t === 'E' || t === 'S'
  ctx.fillStyle = 'rgba(32,36,47,0.14)'
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const tile = map[y]?.[x]
      if (tile !== '#' && tile !== '|' && tile !== '-') continue
      const px = x * TILE
      const py = y * TILE
      if (isFloor(map[y + 1]?.[x])) ctx.fillRect(px, py + TILE, TILE, 5)
      if (tile !== '-' && isFloor(map[y]?.[x + 1])) ctx.fillRect(px + TILE, py, 5, TILE)
    }
  }

  // Growtopia-style crisp outline + bevel where walls meet floors (3/4 depth).
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const tile = map[y]?.[x]
      if (tile !== '|' && tile !== '-') continue
      const px = x * TILE
      const py = y * TILE
      if (tile === '-') {
        ctx.fillStyle = 'rgba(32,36,47,0.55)'
        ctx.fillRect(px, py + TILE - 1, TILE, 1)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillRect(px, py + 1, TILE, 1)
      } else {
        if (isFloor(map[y]?.[x + 1])) {
          ctx.fillStyle = 'rgba(32,36,47,0.55)'
          ctx.fillRect(px + TILE - 1, py, 1, TILE)
        }
        if (isFloor(map[y]?.[x - 1])) {
          ctx.fillStyle = 'rgba(32,36,47,0.45)'
          ctx.fillRect(px, py, 1, TILE)
        }
      }
    }
  }
  // soft bevel on wood/tile floors: lit top-left edge of every tile
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const tile = map[y]?.[x]
      if (tile !== 'm' && tile !== 'g') continue
      ctx.fillStyle = 'rgba(255,255,255,0.10)'
      ctx.fillRect(x * TILE, y * TILE, TILE, 1)
      ctx.fillRect(x * TILE, y * TILE, 1, TILE)
    }
  }

  // warm sunlight pooling inside the south windows
  for (const wx of [3, 8, 21, 26]) {
    ctx.fillStyle = 'rgba(255,225,150,0.20)'
    ctx.fillRect(wx * TILE + 2, 17 * TILE - 12, 12, 12)
    ctx.fillStyle = 'rgba(255,225,150,0.14)'
    ctx.fillRect(wx * TILE + 4, 17 * TILE - 15, 8, 3)
  }

  // 3/4 north wall face + wall-mounted details
  drawNorthWall(ctx)
  drawPantryShelf(ctx, 21, 0)
  drawWallPoster(ctx, 9, 0, PAL.sticky3)
  drawWallPoster(ctx, 17, 0, PAL.sticky4)

  // Interior wall baseboards and door frames (depth + readable room breaks)
  for (const row of [6, 11]) {
    for (let x = 2; x <= 29; x++) {
      const tile = map[row]?.[x]
      if (tile === '-') {
        ctx.fillStyle = 'rgba(90,105,130,0.22)'
        ctx.fillRect(x * TILE, row * TILE + TILE - 4, TILE, 1)
      } else if (tile === 'c') {
        drawDoorFrame(ctx, x, row, false)
      }
    }
  }
  for (const [x, y0, y1] of [[12, 8, 9], [18, 8, 9], [24, 8, 9], [12, 13, 14], [19, 13, 14]] as const) {
    for (let y = y0; y <= y1; y++) drawDoorFrame(ctx, x, y, true)
  }

  // Building details
  drawEntranceDoor(ctx)
  drawWindowsBottom(ctx)
  // trees & bushes outside (kept off the north wall face)
  for (const [x, y] of [[0, 0], [31, 0], [0, 5], [31, 6], [0, 12], [31, 13]] as const) drawTree(ctx, x, y)
  for (const [x, y] of [[0, 9], [0, 15], [31, 3], [31, 10], [31, 16]] as const) drawBush(ctx, x, y)
  // parking signs along the street
  drawParkingSign(ctx, 6, 18)
  drawParkingSign(ctx, 23, 18)

  // Ruang Meeting — rug, long table with chairs, presentation wall
  drawRug(ctx, 3, 3, 8, 2, PAL.rug, PAL.rugDark)
  drawMeetingTable(ctx)
  for (const seat of MEETING_SEATS) drawChairBack(ctx, seat.x, seat.y)
  for (const seat of MEETING_SEATS.slice(4)) {
    // flip backrest below for chairs south of the table
    const px = seat.x * TILE
    const py = seat.y * TILE
    ctx.fillStyle = PAL.floorWood
    ctx.fillRect(px + 4, py + 1, 10, 3)
    ctx.fillStyle = PAL.chairDark
    ctx.fillRect(px + 4, py + TILE - 4, 10, 3)
  }
  drawPlant(ctx, 2, 5)
  drawPlant(ctx, 11, 5)
  drawWallClock(ctx, 10, 2)

  // Ruang Ketua & Sekretariat — executive desk, archive, books
  drawRug(ctx, 13, 2, 6, 4, PAL.rugGreen, PAL.rugGreenDark)
  for (const seat of KETUA_SEATS) drawKetuaDesk(ctx, seat.x, seat.y + 1)
  for (const seat of KETUA_SEATS) drawChairBack(ctx, seat.x, seat.y)
  drawCabinet(ctx, 13, 2)
  drawCabinet(ctx, 13, 3)
  drawBookshelf(ctx, 13, 5, 2)
  drawPlantLarge(ctx, 18, 2)

  // Pantry — counter, fridge, coffee table, mugs, plant
  drawCounter(ctx, 20, 2, 4)
  drawFridge(ctx, 24, 2)
  drawRug(ctx, 20, 4, 5, 1, '#f0e2c8', '#dcc9a6')
  drawCoffeeTable(ctx, 21, 4)
  drawMug(ctx, 21 * TILE + 4, 4 * TILE + 1, '#c9573f')
  drawMug(ctx, 21 * TILE + 13, 4 * TILE + 2, '#4f8ff7')
  drawMug(ctx, 22 * TILE + 2, 4 * TILE + 2, '#3f9c50')
  drawPlant(ctx, 20, 5)

  // Ruang Arsip — archive cabinets, document desks, file boxes, printer
  drawArsip(ctx)

  // Workspace desks (under each seat) + aisle details
  for (const seat of WORKSPACE_SEATS) drawDesk(ctx, seat.x, seat.y + 1)
  for (const seat of WORKSPACE_SEATS) drawChairBack(ctx, seat.x, seat.y)
  drawPlant(ctx, 11, 6)
  drawPlant(ctx, 2, 10)
  drawWhiteboard(ctx, 9, 6)

  // Keuangan — cash desk, safe, archive, plant
  drawRug(ctx, 13, 7, 5, 4, PAL.rug, PAL.rugDark)
  for (const seat of KEUANGAN_SEATS) drawKasDesk(ctx, seat.x, seat.y + 1)
  for (const seat of KEUANGAN_SEATS) drawChairBack(ctx, seat.x, seat.y)
  drawSafe(ctx, 16, 7)
  drawCabinet(ctx, 16, 9)
  drawPlant(ctx, 17, 10)

  // Corridor — runner rug, water cooler, plants, clock, wall TV
  drawRug(ctx, 19, 8, 5, 2, '#cfe4c1', '#a9c99a')
  drawWaterCooler(ctx, 19, 10)
  drawPlant(ctx, 23, 7)
  drawTrashBin(ctx, 23, 10)
  drawWallClock(ctx, 23, 11)
  drawTVScreen(ctx, 19, 6)
  drawWallPoster(ctx, 21, 11, PAL.sticky2)

  // Humas & Media — desks, camera, poster wall, plant
  drawRug(ctx, 25, 7, 5, 4, PAL.rugGreen, PAL.rugGreenDark)
  for (const seat of HUMAS_SEATS) drawDesk(ctx, seat.x, seat.y + 1)
  for (const seat of HUMAS_SEATS) drawChairBack(ctx, seat.x, seat.y)
  drawCamera(ctx, 29, 7)
  drawMediaBoard(ctx, 28, 8)
  drawPlant(ctx, 25, 10)

  // Project Board room — board, discussion table, chairs, plant
  drawRug(ctx, 2, 12, 10, 5, '#e8dcc8', '#d4c3a8')
  drawBoard(ctx, 3, 13, boardStickies)
  {
    const tx = 7 * TILE
    const ty = 14 * TILE + 2
    ctx.fillStyle = PAL.outline
    ctx.fillRect(tx, ty, TILE * 4, TILE * 2 - 4)
    ctx.fillStyle = PAL.wood
    ctx.fillRect(tx + 1, ty + 1, TILE * 4 - 2, TILE * 2 - 6)
    ctx.fillStyle = PAL.woodLight
    ctx.fillRect(tx + 1, ty + 1, TILE * 4 - 2, 2)
    drawPapers(ctx, tx + 8, ty + 5)
    drawMug(ctx, tx + 40, ty + 5, '#c9573f')
  }
  drawChairBack(ctx, 7, 13)
  drawChairBack(ctx, 9, 13)
  drawPlantLarge(ctx, 2, 15)
  drawPlant(ctx, 11, 16)

  // Entrance hall — reception, bench, sign, rug, cat spot
  drawRug(ctx, 13, 13, 6, 4, PAL.rugGreen, PAL.rugGreenDark)
  drawReceptionDesk(ctx, 17, 13)
  drawBench(ctx, 13, 15)
  drawSign(ctx, 13, 17)
  drawPlant(ctx, 13, 16)
  drawMug(ctx, 17 * TILE + 2, 13 * TILE + 9, '#3f9c50')

  // Aula & Panggung — stage, lights, announcement board, audience chairs
  drawStage(ctx, 26, 12)
  drawPodium(ctx, 27, 12)
  drawStageLight(ctx, 26, 11)
  drawStageLight(ctx, 29, 11)
  ctx.fillStyle = 'rgba(255,240,180,0.20)'
  ctx.fillRect(26 * TILE + 10, 12 * TILE + 12, 10, 8)
  ctx.fillRect(28 * TILE + 10, 12 * TILE + 12, 10, 8)
  drawAnnouncementBoard(ctx, 20, 16)
  {
    // activity pins: red = blocked tasks, blue = recent activity (real data)
    const bx = 20 * TILE
    const by = 16 * TILE
    const red = Math.min(3, pins.blocked)
    const blue = Math.min(3, pins.events > 0 ? 2 : 0)
    for (let i = 0; i < red; i++) {
      ctx.fillStyle = '#ff7b86'
      ctx.fillRect(bx + 6 + i * 8, by + 5, 2, 2)
    }
    for (let i = 0; i < blue; i++) {
      ctx.fillStyle = '#4f8ff7'
      ctx.fillRect(bx + 14 + i * 8, by + 5, 2, 2)
    }
  }
  for (const seat of AULA_SEATS) drawSideChairBack(ctx, seat.x, seat.y)
  drawRug(ctx, 20, 13, 5, 4, '#cfe4c1', '#a9c99a')
  drawPlantLarge(ctx, 20, 12)
  drawPlant(ctx, 29, 16)
  drawPendantLamp(ctx, 22, 11, phase === 'malam' || phase === 'sore')
  drawPendantLamp(ctx, 25, 11, phase === 'malam' || phase === 'sore')

  // Ambient light (tint, lamps, window glow, stars) is applied per frame in
  // drawLighting() so the day cycle is continuous, not a hard phase switch.

  // Room name plaques: real pixels (3×5 bitmap font), never DOM text.
  for (const label of ROOM_LABELS) {
    drawPlaque(ctx, label.text, Math.round(label.x * TILE), Math.round(label.y * TILE) - 5, {
      bg: '#2e3a52',
      border: PAL.outline,
      fg: '#ffffff',
      shadow: 'rgba(32,36,47,0.35)',
    })
  }

  return canvas
}


// ---------------------------------------------------------------------------
// Ruang Arsip (archive & documentation room) art + live clock + stage glow + birds
// ---------------------------------------------------------------------------

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/** Outlined file box with a white label — one of a few stacked archive boxes. */
function drawFileBox(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  box(ctx, x, y, 14, 6, PAL.outline)
  box(ctx, x + 1, y + 1, 12, 4, color)
  box(ctx, x + 1, y + 1, 12, 1, shadeHex(color, 0.3))
  box(ctx, x + 4, y + 2, 6, 2, '#ffffff')
}

function drawPrinter(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  box(ctx, x, y, 26, 12, PAL.outline)
  box(ctx, x + 1, y + 3, 24, 8, '#e9edf3')
  box(ctx, x + 1, y + 1, 24, 3, '#cfd6e2')
  box(ctx, x + 5, y - 2, 14, 4, PAL.outline)
  box(ctx, x + 6, y - 1, 12, 3, '#ffffff')
  box(ctx, x + 4, y + 7, 14, 2, '#8d95a6')
  box(ctx, x + 20, y + 5, 2, 2, '#3ccf91')
}

function drawArsip(ctx: CanvasRenderingContext2D): void {
  drawRug(ctx, 26, 2, 4, 4, '#d9d3c0', '#b8b09a')
  // archive wall: two filing cabinets + a document shelf
  drawCabinet(ctx, 26, 2)
  drawCabinet(ctx, 27, 2)
  drawBookshelf(ctx, 28, 2, 2)
  // two document desks with chairs
  for (const seat of ARSIP_SEATS) drawDesk(ctx, seat.x, seat.y + 1)
  for (const seat of ARSIP_SEATS) drawChairBack(ctx, seat.x, seat.y)
  // floor: stacked archive boxes, plant, shared printer
  drawFileBox(ctx, 26 * TILE + 1, 5 * TILE + 9, '#c9a66b')
  drawFileBox(ctx, 26 * TILE + 1, 5 * TILE + 3, '#d98f6a')
  drawFileBox(ctx, 26 * TILE + 3, 5 * TILE - 3, '#7fa6d9')
  drawPlant(ctx, 27, 5)
  drawPrinter(ctx, 28 * TILE + 3, 5 * TILE + 3)
}

/** Wall clock hands follow the real clock (face is redrawn every frame). */
function drawLiveClock(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, now: Date): void {
  const px = tileX * TILE
  const py = tileY * TILE
  box(ctx, px + 4, py + 3, 8, 8, '#ffffff')
  box(ctx, px + 7, py + 4, 2, 1, '#8d95a6')
  box(ctx, px + 7, py + 10, 2, 1, '#8d95a6')
  box(ctx, px + 4, py + 7, 1, 2, '#8d95a6')
  box(ctx, px + 11, py + 7, 1, 2, '#8d95a6')
  const cx = px + 8
  const cy = py + 7
  const hand = (turn: number, len: number, color: string) => {
    const a = turn * Math.PI * 2 - Math.PI / 2
    for (let i = 0; i <= len; i++) box(ctx, Math.round(cx + Math.cos(a) * i), Math.round(cy + Math.sin(a) * i), 1, 1, color)
  }
  const sec = now.getSeconds() + now.getMilliseconds() / 1000
  const min = now.getMinutes() + sec / 60
  hand(((now.getHours() % 12) + min / 60) / 12, 2, '#26314b')
  hand(min / 60, 3, '#26314b')
  hand(sec / 60, 3, '#d9505a')
  box(ctx, cx, cy, 1, 1, '#26314b')
}

function drawStageBeam(ctx: CanvasRenderingContext2D, tileX: number, timestamp: number, index: number): void {
  const colors = ['rgba(255,120,140,0.16)', 'rgba(120,200,255,0.16)', 'rgba(255,230,120,0.16)']
  ctx.fillStyle = colors[(Math.floor(timestamp / 1400) + index) % colors.length]!
  const cx = tileX * TILE + 8
  for (let k = 0; k < 6; k++) ctx.fillRect(cx - 2 - k, 12 * TILE + k * 2, 5 + k * 2, 2)
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, flap: boolean): void {
  ctx.fillStyle = '#3a4157'
  ctx.fillRect(x + 2, y + 1, 3, 1)
  ctx.fillRect(x + 5, y, 1, 1)
  if (flap) {
    ctx.fillRect(x, y, 2, 1)
    ctx.fillRect(x + 3, y - 1, 2, 1)
  } else {
    ctx.fillRect(x, y + 2, 2, 1)
    ctx.fillRect(x + 3, y + 2, 2, 1)
  }
}

/** Pixel car for the street outside — decoration only. */
function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x, y + 3, 24, 8)
  ctx.fillRect(x + 4, y, 14, 5)
  ctx.fillStyle = color
  ctx.fillRect(x + 1, y + 4, 22, 5)
  ctx.fillRect(x + 5, y + 1, 12, 4)
  ctx.fillStyle = '#d6efff'
  ctx.fillRect(x + 6, y + 2, 4, 3)
  ctx.fillRect(x + 11, y + 2, 5, 3)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(x + 2, y + 4, 4, 1)
  ctx.fillStyle = '#ffe08a'
  ctx.fillRect(x + 22, y + 5, 2, 2)
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x + 3, y + 9, 5, 3)
  ctx.fillRect(x + 16, y + 9, 5, 3)
  ctx.fillStyle = '#8f98ad'
  ctx.fillRect(x + 4, y + 10, 3, 1)
  ctx.fillRect(x + 17, y + 10, 3, 1)
}


// ---------------------------------------------------------------------------
// Continuous lighting (driven by the real clock or the preview slider)
// ---------------------------------------------------------------------------

const LIT_ROOMS = [
  [2, 2, 10, 4], [13, 2, 6, 4], [20, 2, 5, 4], [26, 2, 4, 4],
  [2, 7, 10, 4], [13, 7, 5, 4], [19, 7, 5, 4], [25, 7, 5, 4],
  [2, 12, 10, 5], [13, 12, 6, 5], [20, 12, 10, 5],
] as const
const LAMP_SPOTS = [[21, 14], [8, 14], [6, 8], [22, 9], [15, 4], [5, 4]] as const
const WINDOW_TILES = [3, 8, 21, 26] as const
const CARS = [
  { speed: 22, offset: 40, color: '#e0605a' },
  { speed: 15, offset: 260, color: '#4f84d8' },
] as const
const CAR_Y = 19 * TILE + 2

function carX(t: number, car: (typeof CARS)[number]): number {
  return ((t * car.speed + car.offset) % (SCENE_W + 120)) - 40
}

/** Pixel-stepped glow: nested rects with falling alpha (no smooth gradients). */
function glowPool(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rgb: string, alpha: number): void {
  for (let i = 3; i >= 1; i--) {
    const rr = Math.round((r * i) / 3)
    ctx.fillStyle = `rgba(${rgb},${(alpha * (4 - i)) / 3})`
    ctx.fillRect(cx - rr, cy - Math.round(rr * 0.7), rr * 2, Math.round(rr * 1.4))
  }
}

function drawLighting(ctx: CanvasRenderingContext2D, light: DayLight, timestamp: number, motion: boolean): void {
  const t = motion ? timestamp / 1000 : 0
  // 1) ambient tint over everything
  if (light.tint.a > 0.004) {
    ctx.fillStyle = `rgba(${light.tint.r},${light.tint.g},${light.tint.b},${light.tint.a})`
    ctx.fillRect(0, 0, SCENE_W, SCENE_H)
  }
  // 2) interior lamps + warm windows (additive) fade in at dusk, out after sunrise
  if (light.lamps > 0.02) {
    ctx.globalCompositeOperation = 'lighter'
    const flick = motion ? 1 + Math.sin(t * 3.1) * 0.03 : 1
    for (const [rx, ry, rw, rh] of LIT_ROOMS) {
      ctx.fillStyle = `rgba(255,205,120,${0.075 * light.lamps})`
      ctx.fillRect(rx * TILE + 2, ry * TILE + 2, rw * TILE - 4, rh * TILE - 4)
    }
    for (const [lx, ly] of LAMP_SPOTS) glowPool(ctx, lx * TILE + 8, ly * TILE + 8, 30, '255,214,140', 0.13 * light.lamps * flick)
    for (const wx of WINDOW_TILES) {
      ctx.fillStyle = `rgba(255,205,120,${0.55 * light.lamps})`
      ctx.fillRect(wx * TILE + 4, 17 * TILE + 5, 8, 6)
      ctx.fillStyle = `rgba(255,205,120,${0.14 * light.lamps})`
      ctx.fillRect(wx * TILE - 2, 17 * TILE - 10, TILE + 4, 10) // spill on the floor
    }
    ctx.fillStyle = `rgba(255,205,120,${0.4 * light.lamps})`
    ctx.fillRect(14 * TILE - 2, 17 * TILE, 3, TILE)
    ctx.fillRect(17 * TILE - 1, 17 * TILE, 3, TILE)
    ctx.globalCompositeOperation = 'source-over'
  }
  // 3) sunlight shafts through the south windows (day only, gently breathing)
  if (light.sun > 0.05) {
    ctx.globalCompositeOperation = 'lighter'
    const breathe = 0.85 + Math.sin(t * 0.6) * 0.15
    for (const wx of WINDOW_TILES) {
      ctx.fillStyle = `rgba(255,236,170,${0.11 * light.sun * breathe})`
      ctx.fillRect(wx * TILE, 17 * TILE - 22, TILE, 22)
      ctx.fillStyle = `rgba(255,236,170,${0.07 * light.sun * breathe})`
      ctx.fillRect(wx * TILE + 3, 17 * TILE - 40, TILE - 6, 18)
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  // 4) outdoors only: stars at night, drifting cloud shadows by day, headlights
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, SCENE_W, TILE)
  ctx.rect(0, 18 * TILE, SCENE_W, 2 * TILE)
  ctx.rect(0, TILE, TILE, 17 * TILE)
  ctx.rect(31 * TILE, TILE, TILE, 17 * TILE)
  ctx.clip()
  if (light.stars > 0.05) {
    for (let i = 0; i < 26; i++) {
      const sx = (hash2(i, 3) % (SCENE_W - 4)) + 2
      const sy = (hash2(i, 9) % 12) + 2
      const tw = motion ? 0.55 + 0.45 * Math.sin(t * 2 + i * 1.7) : 1
      ctx.fillStyle = `rgba(255,255,225,${light.stars * tw})`
      ctx.fillRect(sx, sy, 1, 1)
      if (i % 5 === 0) ctx.fillRect(sx - 1, sy, 3, 1)
    }
  }
  if (light.sun > 0.1) {
    for (const [speed, off, y, w] of [[5, 20, 4, 54], [3.5, 190, 70, 70], [4.2, 330, 296, 60]] as const) {
      const cx = ((t * speed + off) % (SCENE_W + 160)) - 80
      ctx.fillStyle = `rgba(15,45,35,${0.09 * light.sun})`
      ctx.fillRect(Math.round(cx), y, w, 8)
      ctx.fillRect(Math.round(cx) + 8, y - 4, w - 16, 4)
      ctx.fillRect(Math.round(cx) + 8, y + 8, w - 16, 4)
    }
  }
  if (light.darkness > 0.25) {
    ctx.globalCompositeOperation = 'lighter'
    for (const car of CARS) {
      const x = Math.round(carX(t, car))
      ctx.fillStyle = `rgba(255,230,150,${0.22 * light.darkness})`
      ctx.fillRect(x + 24, CAR_Y + 5, 16, 4)
      ctx.fillStyle = `rgba(255,230,150,${0.12 * light.darkness})`
      ctx.fillRect(x + 40, CAR_Y + 4, 14, 6)
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}

/** Meeting room "live" treatment: pulsing floor light + RAPAT tag (data-driven). */
function drawMeetingLive(ctx: CanvasRenderingContext2D, count: number, timestamp: number, motion: boolean): void {
  const pulse = motion ? 0.5 + 0.5 * Math.sin(timestamp / 520) : 0.5
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = `rgba(120,170,255,${0.05 + pulse * 0.04})`
  ctx.fillRect(2 * TILE + 2, 2 * TILE + 2, 10 * TILE - 4, 4 * TILE - 4)
  ctx.fillStyle = `rgba(160,200,255,${0.06 + pulse * 0.05})`
  ctx.fillRect(4 * TILE, 3 * TILE, 6 * TILE, 2 * TILE)
  ctx.globalCompositeOperation = 'source-over'
  const label = count > 1 ? `RAPAT ${count}` : 'RAPAT'
  const w = measurePixelText(label) + 12
  const x = Math.round(10.1 * TILE) - 29 - Math.round(w / 2) - 14
  const y = Math.round(1.48 * TILE) - 5
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x - 1, y - 1, w + 2, 11)
  ctx.fillStyle = '#c9454f'
  ctx.fillRect(x, y, w, 9)
  ctx.fillStyle = '#e5707a'
  ctx.fillRect(x, y, w, 1)
  ctx.fillStyle = !motion || Math.floor(timestamp / 500) % 2 === 0 ? '#ffffff' : '#ffb3b8'
  ctx.fillRect(x + 3, y + 3, 3, 3)
  drawPixelText(ctx, label, x + 8, y + 2, '#ffffff')
}

/** Small "…" speech bubble — the speaker rotates among seated attendees. */
function drawTalkBubble(ctx: CanvasRenderingContext2D, cx: number, topY: number, step: number): void {
  const x = cx - 6
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x - 1, topY - 1, 14, 9)
  ctx.fillRect(cx - 1, topY + 8, 3, 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, topY, 12, 7)
  ctx.fillRect(cx, topY + 8, 1, 1)
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === step ? '#2e3a52' : '#a9b2c3'
    ctx.fillRect(x + 2 + i * 3, topY + 3 - (i === step ? 1 : 0), 2, 2)
  }
}

function drawTypingDots(ctx: CanvasRenderingContext2D, cx: number, topY: number, phaseIndex: number): void {
  ctx.fillStyle = PAL.outline
  ctx.fillRect(cx - 6, topY, 13, 7)
  ctx.fillRect(cx - 5, topY - 1, 11, 9)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(cx - 5, topY + 1, 11, 5)
  ctx.fillStyle = PAL.outline
  ctx.fillRect(cx - 1, topY + 7, 2, 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(cx - 1, topY + 7, 1, 1)
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === phaseIndex ? '#1d9e74' : '#9aa5b5'
    ctx.fillRect(cx - 3 + i * 3, topY + 3 - (i === phaseIndex ? 1 : 0), 2, 2)
  }
}

function memberPixelAnchor(member: SceneMemberVM): { px: number; py: number } {
  // Center the 18-wide character over its seat (desks are 2 tiles = 32 px).
  const px = member.seat.x * TILE + (member.seat.wide ? Math.floor((TILE * 2 - CHAR_W) / 2) : Math.floor((TILE - CHAR_W) / 2))
  // +4: the 16×24 sprite keeps its feet where the older 28px sprite stood
  const py = member.seat.y * TILE + (member.seat.dy ?? 0) + 4
  return { px, py }
}

/**
 * Seamless lawn for the margins around the building (when the integer zoom
 * leaves spare width). 16×4 tiles, built with the same stripe/tuft/flower
 * rules as the map's grass so it continues the canvas edge exactly.
 */
function makeLawnUrl(): string {
  const c = document.createElement('canvas')
  c.width = 16 * TILE
  c.height = 4 * TILE
  const g = c.getContext('2d')
  if (!g) return ''
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 16; x++) {
      const px = x * TILE
      const py = y * TILE
      g.fillStyle = PAL.grass
      g.fillRect(px, py, TILE, TILE)
      if ((x >> 1) % 2 === 0) {
        g.fillStyle = 'rgba(255,255,255,0.06)'
        g.fillRect(px, py, TILE, TILE)
      }
      if (hash2(x, y) % 5 === 0) {
        g.fillStyle = PAL.grassTuft
        g.fillRect(px + 4 + (hash2(x, y) % 6), py + 4 + (hash2(x + 1, y) % 6), 3, 2)
        g.fillRect(px + 9, py + 10, 2, 2)
      }
      if (hash2(x * 3 + 1, y * 5 + 2) % 7 === 0) {
        const fx = px + 3 + (hash2(x, y * 2) % 9)
        const fy = py + 3 + (hash2(y, x * 2) % 9)
        g.fillStyle = ['#ffffff', '#ffd166', '#f2a3c0'][hash2(x + 3, y + 7) % 3] ?? '#ffffff'
        g.fillRect(fx, fy, 1, 3)
        g.fillRect(fx - 1, fy + 1, 3, 1)
        g.fillStyle = '#e8973f'
        g.fillRect(fx, fy + 1, 1, 1)
      }
    }
  }
  return c.toDataURL('image/png')
}

interface Props {
  vm: SceneViewModel
  selectedUserId: string | null
  onSelectMember: (userId: string) => void
  motionEnabled: boolean
  /** Real-clock ambience phase (pagi/siang/sore/malam). */
  phase: DayPhase
  /** Preview hour (0–24). null = follow the real clock continuously. */
  simHour: number | null
  /** Presence honesty: characters only during working hours. */
  present: boolean
  /** Scene hotspots navigate to the related work pages. */
  onNavigate: (route: Route) => void
}

interface WalkState {
  x: number
  y: number
  path: { x: number; y: number }[]
  target: string
  startAt?: number
}

/**
 * Members already seen in the scene, per workspace (module scope, so it also
 * survives leaving the dashboard and coming back). A member that is NOT in this
 * set when the scene draws is new: they walk in through the entrance door and
 * go to their seat instead of popping into existence.
 */
const knownMembers = new Map<string, Set<string>>()
const DOOR_TILE = { x: 15, y: 16 }

function doorSpawn(member: SceneMemberVM, startAt: number): WalkState {
  const anchor = memberPixelAnchor(member)
  const to = { x: Math.round((anchor.px + CHAR_W / 2) / TILE), y: Math.floor((anchor.py + CHAR_H - 1) / TILE) }
  const tiles = findPath(WALK_GRID, DOOR_TILE, to)
  const path = (tiles ?? []).map((t) => ({ x: t.x * TILE + (TILE - CHAR_W) / 2, y: t.y * TILE - (CHAR_H - TILE) }))
  path.push({ x: anchor.px, y: anchor.py })
  return {
    x: DOOR_TILE.x * TILE,
    y: DOOR_TILE.y * TILE - (CHAR_H - TILE),
    path,
    target: `${anchor.px},${anchor.py}`,
    startAt,
  }
}

export function PixelOfficeScene({ vm, selectedUserId, onSelectMember, motionEnabled, phase, simHour, present, onNavigate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [dpr, setDpr] = useState(1)
  /** null = auto-fit (largest integer scale that fits); otherwise a fixed integer zoom. */
  const [zoom, setZoom] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => {
      setContainerWidth(el.clientWidth)
      setDpr(window.devicePixelRatio || 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const autoScale = Math.max(1, Math.min(MAX_SCALE, Math.floor((containerWidth * dpr) / SCENE_W + 0.12)))
  const scale = zoom ?? autoScale
  const cssW = (SCENE_W * scale) / dpr
  const cssH = (SCENE_H * scale) / dpr
  const lawnUrl = useMemo(() => makeLawnUrl(), [])
  const lawnTintRef = useRef<HTMLDivElement>(null)
  const lastTintRef = useRef('')
  const sideGap = Math.max(0, (containerWidth - cssW) / 2)
  const stateRef = useRef({ vm, selectedUserId, motionEnabled, present, hoveredUserId, simHour })
  stateRef.current = { vm, selectedUserId, motionEnabled, present, hoveredUserId, simHour }
  // Re-light when the preview hour moves or (motion off) every ~5 real minutes.
  const lightBucket = simHour ?? Math.floor(fractionalHour(new Date()) * 12)
  // Smooth walking: persisted per-character pixel positions easing toward
  // their data-derived seat along BFS paths through doorways.
  const posRef = useRef(new Map<string, WalkState>())
  /** userId → timestamp until which the "BARU" tag floats over a newcomer. */
  const welcomeRef = useRef(new Map<string, number>())
  const lastVmRef = useRef<SceneViewModel | null>(null)

  // Presence honesty: when the working day starts, characters arrive through
  // the entrance (staggered walk-in); when it ends, the office empties.
  const prevPresentRef = useRef(present)
  useEffect(() => {
    const becamePresent = present && !prevPresentRef.current
    prevPresentRef.current = present
    if (!present) {
      posRef.current.clear()
      return
    }
    if (!becamePresent) return
    stateRef.current.vm.members.forEach((member, index) => {
      posRef.current.set(member.userId, doorSpawn(member, (performance.now() ?? 0) + index * 380))
    })
  }, [present])

  const staticLayer = useMemo(
    () =>
      renderStaticLayer(
        vm.boardPrograms.map((p) => STICKY_BY_STATUS[p.status] ?? PAL.sticky1),
        vm.activityPins,
        phase,
        scale,
      ),
    [vm.boardPrograms, vm.activityPins, phase, scale],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.setTransform(scale, 0, 0, scale, 0, 0)

    let raf = 0
    let running = false
    let lastFrame = 0
    let lastStep = 0
    let visible = true

    const draw = (timestamp: number) => {
      const { vm: currentVm, selectedUserId: selected, motionEnabled: motion, present: isPresent, hoveredUserId: hovered, simHour: previewHour } = stateRef.current
      const dt = lastFrame === 0 ? 16 : Math.min(64, timestamp - lastFrame)
      lastFrame = timestamp
      if (motion && timestamp - lastStep >= 160) {
        frameRef.current = (frameRef.current + 1) % 4
        lastStep = timestamp
      }
      ctx.clearRect(0, 0, SCENE_W, SCENE_H)
      // The static layer is rendered at 3× too; draw it 1:1 in device pixels.
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(staticLayer, 0, 0)
      ctx.setTransform(scale, 0, 0, scale, 0, 0)

      // Real-time wall clocks + coloured stage beams (decoration)
      const nowDate = new Date()
      drawLiveClock(ctx, 10, 2, nowDate)
      drawLiveClock(ctx, 23, 11, nowDate)
      if (motion) {
        drawStageBeam(ctx, 26, timestamp, 0)
        drawStageBeam(ctx, 29, timestamp, 1)
      }

      // Outside working hours the office is honestly empty (docs/PRD.md §10).
      const members = isPresent ? [...currentVm.members] : []

      // 1) advance every character along its BFS path, then draw sorted by
      //    current feet position so overlapping characters layer correctly.
      const entries: { member: SceneMemberVM; px: number; py: number; walking: boolean }[] = []
      for (const member of members) {
        const anchor = memberPixelAnchor(member)
        const targetKey = `${anchor.px},${anchor.py}`
        let pos = posRef.current.get(member.userId)
        if (!pos) {
          const known = knownMembers.get(currentVm.workspaceId)
          const isNewcomer = motion && known !== undefined && !known.has(member.userId)
          if (isNewcomer) {
            // walk in through the entrance door, then to the assigned seat
            pos = doorSpawn(member, timestamp + 250)
            welcomeRef.current.set(member.userId, timestamp + 9000)
          } else {
            pos = { x: anchor.px, y: anchor.py, path: [], target: targetKey }
          }
          posRef.current.set(member.userId, pos)
        } else if (pos.target !== targetKey) {
          // seat changed (meeting started/ended, data updated): walk there via doorways
          const from = {
            x: Math.floor((pos.x + CHAR_W / 2) / TILE),
            y: Math.floor((pos.y + CHAR_H - 1) / TILE),
          }
          const to = { x: Math.round((anchor.px + CHAR_W / 2) / TILE), y: Math.floor((anchor.py + CHAR_H - 1) / TILE) }
          const tiles = findPath(WALK_GRID, from, to)
          const waypoints = (tiles ?? []).map((t) => ({ x: t.x * TILE + (TILE - CHAR_W) / 2, y: t.y * TILE - (CHAR_H - TILE) }))
          if (tiles === null) {
            // unreachable (should not happen between floor seats): glide directly
            waypoints.push({ x: anchor.px, y: anchor.py })
          }
          pos.path = waypoints
          pos.target = targetKey
        }

        let walking = false
        if (motion && (!pos.startAt || timestamp >= pos.startAt)) {
          pos.startAt = undefined
          // calm walking pace in logical pixels per second, frame-rate independent
          let budget = 64 * (dt / 1000)
          while (budget > 0 && pos.path.length > 0) {
            const wp = pos.path[0]!
            const dx = wp.x - pos.x
            const dy = wp.y - pos.y
            const dist = Math.hypot(dx, dy)
            if (dist <= budget) {
              pos.x = wp.x
              pos.y = wp.y
              pos.path.shift()
              budget -= dist
              walking = true
            } else {
              pos.x += (dx / dist) * budget
              pos.y += (dy / dist) * budget
              budget = 0
              walking = true
            }
          }
          // final approach to the exact seat anchor
          const rx = anchor.px - pos.x
          const ry = anchor.py - pos.y
          const rd = Math.hypot(rx, ry)
          if (pos.path.length === 0 && rd > 0.5) {
            const step = Math.min(rd, budget)
            if (step > 0) {
              pos.x += (rx / rd) * step
              pos.y += (ry / rd) * step
              walking = true
            }
          } else if (pos.path.length === 0 && rd > 0 && rd <= 0.5) {
            pos.x = anchor.px
            pos.y = anchor.py
          }
        } else {
          pos.x = anchor.px
          pos.y = anchor.py
          pos.path = []
        }
        entries.push({ member, px: pos.x, py: pos.y, walking })
      }
      entries.sort((a, b) => a.py - b.py || a.px - b.px)

      // 2) draw
      for (const { member, px: rawPx, py: rawPy, walking } of entries) {
        // snap to whole logical pixels — crisp sprite edges, no sub-pixel blur
        const px = Math.round(rawPx)
        const py = Math.round(rawPy)
        const seed = hashIndex(member.userId, 97)
        const blinkWindow = (timestamp + seed * 53) % 4200
        const blink = motion && blinkWindow < 130
        const bob = walking
          ? motion && Math.floor(timestamp / 140) % 2 === 1
            ? -1
            : 0
          : motion && member.activity !== 'meeting' && Math.floor(timestamp / 900 + seed) % 2 === 1
            ? -1
            : 0

        // selection ring (chunky corner brackets, not a solid cover)
        if (member.userId === selected) {
          const x = px - 3
          const y = py - 3
          const w = CHAR_W + 6
          const h = CHAR_H + 6
          ctx.fillStyle = '#1d9e74'
          ctx.fillRect(x, y, w, 2)
          ctx.fillRect(x, y + h - 2, w, 2)
          ctx.fillRect(x, y, 2, h)
          ctx.fillRect(x + w - 2, y, 2, h)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(x + 2, y + 2, w - 4, 1)
          ctx.fillRect(x + 2, y + h - 3, w - 4, 1)
          ctx.fillRect(x + 2, y + 2, 1, h - 4)
          ctx.fillRect(x + w - 3, y + 2, 1, h - 4)
        } else if (member.userId === hovered) {
          ctx.fillStyle = 'rgba(79,143,247,0.9)'
          ctx.fillRect(px - 2, py - 2, CHAR_W + 4, 2)
          ctx.fillRect(px - 2, py + CHAR_H + 1, CHAR_W + 4, 2)
          ctx.fillRect(px - 2, py - 2, 2, CHAR_H + 4)
          ctx.fillRect(px + CHAR_W + 1, py - 2, 2, CHAR_H + 4)
        }

        // soft ground shadow under the character
        ctx.fillStyle = 'rgba(32,36,47,0.28)'
        ctx.fillRect(px + 2, py + CHAR_H - 2, CHAR_W - 4, 2)
        ctx.fillStyle = 'rgba(32,36,47,0.14)'
        ctx.fillRect(px, py + CHAR_H - 1, CHAR_W, 1)

        let pose: CharacterPose = 'idle'
        if (walking) pose = Math.floor(timestamp / 150) % 2 === 0 ? 'walkA' : 'walkB'
        else if (member.activity === 'working') pose = 'work'

        drawCharacter(
          ctx,
          px,
          py + bob,
          member.headIndex,
          pose,
          characterPalette(member.colors, blink),
          member.role,
          // seated behind a desk: hide the legs under the desktop
          !walking && member.seat.wide ? 20 : CHAR_H,
        )

        if (member.activity === 'blocked') {
          drawBadgeBubble(ctx, px + Math.floor(CHAR_W / 2), py - 13, '#ff7b86', '#3a0d12', '!')
        } else if (member.activity === 'in_review') {
          drawBadgeBubble(ctx, px + Math.floor(CHAR_W / 2), py - 13, '#ffd166', '#3a2d10', '?')
        } else if (member.activity === 'meeting' && motion && Math.floor(timestamp / 600) % 2 === 0) {
          // small "in a meeting" dot — derived from the live saved meeting window
          ctx.fillStyle = '#5b6a94'
          ctx.fillRect(px + CHAR_W - 2, py - 2, 3, 3)
        }

        // Screen glow only for desks that have monitors AND a member who is
        // actually working (data-driven — never a fake active screen).
        if (member.activity === 'working' && member.seat.monitor === true) {
          const gx = member.seat.x * TILE + 4
          const gy = (member.seat.y + 1) * TILE + 5
          ctx.fillStyle = motion && frameRef.current % 2 === 0 ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.14)'
          ctx.fillRect(gx, gy, 8, 4)
        }

        // dust puffs behind walking feet (decoration only)
        if (walking && motion && Math.floor(timestamp / 180) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.45)'
          ctx.fillRect(px + (Math.floor(timestamp / 120) % 2 === 0 ? -2 : CHAR_W), py + CHAR_H - 3, 2, 1)
        }
      }

      // Office cat by the reception desk — wanders a little, tail flicks.
      const catPhase = motion ? timestamp / 1000 : 0
      const catX = 14.2 + Math.sin(catPhase * 0.22) * 1.1
      drawCat(ctx, Math.round(catX * TILE) / TILE, 13, motion && Math.floor(timestamp / 700) % 2 === 0)

      // Decorative coffee steam over the pantry machine (motion-gated).
      if (motion) {
        const mx = 20 * TILE + TILE * 3 + 7
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        const steam = Math.floor(timestamp / 380) % 3
        if (steam === 0) {
          ctx.fillRect(mx, 12, 2, 4)
          ctx.fillRect(mx + 4, 6, 2, 4)
        } else if (steam === 1) {
          ctx.fillRect(mx + 2, 10, 2, 4)
          ctx.fillRect(mx - 1, 4, 2, 4)
        } else {
          ctx.fillRect(mx + 1, 8, 2, 4)
          ctx.fillRect(mx + 5, 11, 2, 4)
        }
      }


      // Meeting: one attendee "speaks" at a time (rotating, decoration over real attendance).
      const seated = entries.filter((e) => e.member.activity === 'meeting' && !e.walking)
      if (motion && seated.length > 1) {
        const speaker = seated[Math.floor(timestamp / 2200) % seated.length]!
        drawTalkBubble(ctx, Math.round(speaker.px) + Math.floor(CHAR_W / 2), Math.round(speaker.py) - 13, Math.floor(timestamp / 260) % 3)
      }

      // Typing indicator — only for members with a saved in-progress task.
      for (const { member, px: rawPx, py: rawPy, walking } of entries) {
        if (member.activity === 'working' && !walking && motion) {
          drawTypingDots(ctx, Math.round(rawPx) + 8, Math.round(rawPy) - 11, Math.floor(timestamp / 260) % 3)
        }
        const welcomeUntil = welcomeRef.current.get(member.userId)
        if (welcomeUntil !== undefined) {
          if (timestamp > welcomeUntil) {
            welcomeRef.current.delete(member.userId)
          } else {
            const hop = motion ? Math.floor(timestamp / 300) % 2 : 0
            drawPlaque(ctx, 'BARU', Math.round(rawPx) + 8, Math.round(rawPy) - 19 - hop, {
              bg: '#1d9e74',
              border: PAL.outline,
              fg: '#ffffff',
              shadow: 'rgba(32,36,47,0.35)',
            })
          }
        }
        if (member.userId === selected) {
          const bounce = motion ? Math.floor(timestamp / 220) % 2 : 0
          const ax = Math.round(rawPx) + 8
          const ay = Math.round(rawPy) - (member.activity === 'blocked' || member.activity === 'in_review' ? 24 : 14) - bounce
          ctx.fillStyle = PAL.outline
          ctx.fillRect(ax - 4, ay, 9, 2)
          ctx.fillRect(ax - 3, ay + 2, 7, 1)
          ctx.fillRect(ax - 2, ay + 3, 5, 1)
          ctx.fillRect(ax - 1, ay + 4, 3, 1)
          ctx.fillStyle = '#1d9e74'
          ctx.fillRect(ax - 3, ay, 7, 1)
          ctx.fillRect(ax - 2, ay + 1, 5, 1)
          ctx.fillRect(ax - 1, ay + 2, 3, 1)
        }
      }

      // Street life (decoration): two cars pass the building.
      if (motion) {
        const t = timestamp / 1000
        for (const car of CARS) drawCar(ctx, carX(t, car), CAR_Y, car.color)
      }

      // Birds cross the sky strip in daylight (decoration)
      if (motion && phase !== 'malam') {
        const tb = timestamp / 1000
        for (const [speed, offset, baseY] of [[26, 0, 6], [20, 300, 9]] as const) {
          const bx = ((tb * speed + offset) % (SCENE_W + 80)) - 30
          drawBird(ctx, Math.round(bx), Math.round(baseY + Math.sin(tb * 2 + offset) * 2), Math.floor(tb * 6 + offset) % 2 === 0)
        }
      }

      // Project Board: live progress meter under every program sticky (derived
      // from saved tasks; no tasks yet → empty track, never an invented value).
      currentVm.boardPrograms.forEach((program, i) => {
        const bx = 3 * TILE + 5 + (i % 4) * 14
        const by = 13 * TILE + 9 + Math.floor(i / 4) * 12 + 8
        ctx.fillStyle = '#5a6378'
        ctx.fillRect(bx, by, 8, 2)
        if (program.percent !== null && program.percent > 0) {
          ctx.fillStyle = program.status === 'blocked' ? '#ff7b86' : '#3ccf91'
          ctx.fillRect(bx, by, Math.max(1, Math.round((program.percent / 100) * 8)), 2)
        }
        if (program.status === 'active' && motion && Math.floor(timestamp / 700) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.45)'
          ctx.fillRect(bx, by - 8, 8, 1)
        }
      })

      // Continuous day/night lighting (real clock, or the preview slider).
      const hourNow = previewHour ?? fractionalHour(nowDate)
      const lightNow = dayLight(hourNow)
      drawLighting(ctx, lightNow, timestamp, motion)
      // keep the side lawn in the same light as the scene
      const tintCss = `rgba(${lightNow.tint.r},${lightNow.tint.g},${lightNow.tint.b},${lightNow.tint.a.toFixed(3)})`
      if (tintCss !== lastTintRef.current && lawnTintRef.current) {
        lawnTintRef.current.style.backgroundColor = tintCss
        lastTintRef.current = tintCss
      }
      if (isPresent && currentVm.liveMeetings.length > 0) {
        drawMeetingLive(ctx, currentVm.liveMeetings.length, timestamp, motion)
      }

      // Corridor display + stage banner: real data, drawn as pixel text.
      const corridor = currentVm.corridorDisplay
      if (corridor) {
        const text = `${corridor.title.slice(0, 11)} ${corridor.timeLabel}`.toUpperCase()
        const w = measurePixelText(text) + 10
        const x = Math.round(20 * TILE - w / 2)
        const y = Math.round(6.4 * TILE) - 5
        ctx.fillStyle = '#0d1117'
        ctx.fillRect(x - 1, y - 1, w + 2, 11)
        ctx.fillStyle = '#12202b'
        ctx.fillRect(x, y, w, 9)
        drawPixelText(ctx, text, x + 8, y + 2, '#75e0b3')
        ctx.fillStyle = corridor.live && (!motion || Math.floor(timestamp / 500) % 2 === 0) ? '#ff5c5c' : '#5b2a2a'
        if (corridor.live) ctx.fillRect(x + 3, y + 3, 3, 3)
      }
      if (currentVm.stageProgram) {
        const text = currentVm.stageProgram.slice(0, 18).toUpperCase()
        const w = measurePixelText(text) + 8
        const x = Math.round(27.5 * TILE - w / 2)
        const y = Math.round(12.62 * TILE) - 5
        ctx.fillStyle = PAL.outline
        ctx.fillRect(x - 1, y - 1, w + 2, 11)
        ctx.fillStyle = '#c9573f'
        ctx.fillRect(x, y, w, 9)
        ctx.fillStyle = '#e57a62'
        ctx.fillRect(x, y, w, 1)
        drawPixelText(ctx, text, x + 4, y + 2, '#ffffff')
        // progress meter under the banner (saved tasks only)
        ctx.fillStyle = PAL.outline
        ctx.fillRect(x - 1, y + 10, w + 2, 4)
        ctx.fillStyle = '#5a6378'
        ctx.fillRect(x, y + 11, w, 2)
        if (currentVm.stageProgress !== null) {
          ctx.fillStyle = '#3ccf91'
          ctx.fillRect(x, y + 11, Math.round((w * currentVm.stageProgress) / 100), 2)
        }
      }

      if (lastVmRef.current !== currentVm) {
        knownMembers.set(currentVm.workspaceId, new Set(currentVm.members.map((m) => m.userId)))
        lastVmRef.current = currentVm
      }

      if (motion && visible) {
        raf = requestAnimationFrame(draw)
      } else {
        running = false
        lastFrame = 0
      }
    }

    const start = () => {
      if (!running) {
        running = true
        lastFrame = 0
        raf = requestAnimationFrame(draw)
      }
    }

    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting)
      if (visible) start()
    })
    observer.observe(wrapper)
    start()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
      running = false
    }
  }, [staticLayer, motionEnabled, scale, phase, lightBucket])

  const selectedMember = selectedUserId ? vm.members.find((m) => m.userId === selectedUserId) : null
  const hoveredMember = hoveredUserId ? vm.members.find((m) => m.userId === hoveredUserId) : null
  const sceneSummary = present
    ? `Kantor pixel-art: ${vm.members.length} anggota. ${vm.members.filter((m) => m.activity === 'meeting').length} sedang rapat, ${vm.members.filter((m) => m.activity === 'blocked').length} memiliki tugas terhambat. Daftar anggota yang dapat diakses keyboard tersedia di bawah.`
    : `Kantor pixel-art: kosong — di luar jam kerja (Senin–Jumat 08.00–18.00). Suasana ${phase}.`

  const zoomIn = () => setZoom(Math.min(MAX_SCALE, scale + 1))
  const zoomOut = () => setZoom(Math.max(1, scale - 1))
  const btn = 'char-btn absolute cursor-pointer rounded-[4px] hover:shadow-[inset_0_0_0_2px_rgba(79,143,247,0.9)] focus-visible:shadow-[inset_0_0_0_3px_#4f8ff7]'

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="pixel-scene overflow-auto rounded-[14px] border-2 border-[#26314b] shadow-[0_10px_0_rgba(38,49,75,0.12),0_18px_40px_rgba(38,49,75,0.14)]"
        style={{ backgroundColor: PAL.grass, maxHeight: '82vh', position: 'relative' }}
      >
        {/* Side lawn: continues the map's grass so there are no empty green bars */}
        <div
          aria-hidden
          className="pixelated pointer-events-none absolute inset-0"
          style={{
            backgroundImage: lawnUrl ? `url(${lawnUrl})` : undefined,
            backgroundSize: `${(16 * TILE * scale) / dpr}px ${(4 * TILE * scale) / dpr}px`,
            backgroundPosition: `${sideGap}px 0`,
          }}
        >
          <div ref={lawnTintRef} className="absolute inset-0" />
        </div>
        <div ref={wrapperRef} role="img" aria-label={sceneSummary} className="group relative mx-auto" style={{ width: cssW, height: cssH }}>
          <canvas
            ref={canvasRef}
            width={SCENE_W * scale}
            height={SCENE_H * scale}
            aria-hidden
            className="pixelated absolute inset-0 block"
            style={{ width: cssW, height: cssH }}
          />

          {/* Presence honesty note when the office is empty */}
          {!present && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-[#26314b]/95 px-3 py-1 text-[10px] font-medium text-white shadow sm:text-xs"
            >
              🌙 Di luar jam kerja (Sen–Jum 08.00–18.00) — tim tidak sedang di kantor
            </span>
          )}

          {/* Selected member chip */}
          {selectedMember && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-2 flex max-w-[80%] items-center gap-2 rounded-[6px] border-2 border-[#26314b] bg-[#fdf8ec] px-2 py-1 text-[10px] text-[#26314b] shadow-[0_3px_0_#26314b] sm:text-xs"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-[2px] border border-[#26314b]" style={{ backgroundColor: selectedMember.colors.shirt }} />
              <span className="truncate font-bold">{selectedMember.displayName}</span>
              <span className="truncate text-[#55607a]">{ACTIVITY_LABEL[selectedMember.activity]}</span>
            </span>
          )}

          {/* Hover / focus tooltip card */}
          {hoveredMember && present && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[6px] border-2 border-[#26314b] bg-[#fdf8ec] px-2 py-1 text-[10px] leading-tight text-[#26314b] shadow-[0_3px_0_#26314b] sm:text-xs"
              style={{
                left: `${((memberPixelAnchor(hoveredMember).px + CHAR_W / 2) / SCENE_W) * 100}%`,
                top: `${((memberPixelAnchor(hoveredMember).py - 14) / SCENE_H) * 100}%`,
              }}
            >
              <span className="block font-bold">{hoveredMember.displayName}</span>
              <span className="block text-[#55607a]">
                {ROLE_TITLE[hoveredMember.role] ?? hoveredMember.role} · {hoveredMember.departmentName ?? 'tanpa divisi'}
              </span>
              <span className="block font-medium text-[#1d6f56]">
                {ACTIVITY_LABEL[hoveredMember.activity]}
                {hoveredMember.blockedTaskCount > 0 ? ` · ${hoveredMember.blockedTaskCount} terhambat` : ''}
              </span>
            </span>
          )}

          {/* Scene hotspots: furniture opens the related work page (keyboard-reachable) */}
          <button
            type="button"
            data-name={`Program berjalan: ${vm.boardPrograms.filter((p) => p.status === 'active').length} · buka`}
            aria-label="Buka halaman Program Kerja (papan proyek)"
            onClick={() => onNavigate('program')}
            className={btn}
            style={{ left: '9.4%', top: '64%', width: '14.5%', height: '13%' }}
          />
          <button
            type="button"
            data-name={vm.liveMeetings.length > 0 ? `Rapat berlangsung: ${vm.liveMeetings.length}` : 'Jadwal rapat'}
            aria-label="Buka halaman Rapat (layar koridor)"
            onClick={() => onNavigate('rapat')}
            className={btn}
            style={{ left: '58.5%', top: '28.5%', width: '7.5%', height: '8%' }}
          />
          <button
            type="button"
            data-name="Aktivitas terbaru"
            aria-label="Lihat aktivitas terbaru (papan pengumuman)"
            onClick={() => onNavigate('dashboard')}
            className={btn}
            style={{ left: '62%', top: '78.5%', width: '7.5%', height: '8%' }}
          />

          {/* One real button per character — keyboard-reachable scene selection */}
          {vm.members.map((member) => {
            const { px, py } = memberPixelAnchor(member)
            const blockedNote = member.blockedTaskCount > 0 ? `, ${member.blockedTaskCount} tugas terhambat` : ''
            return (
              <button
                key={member.userId}
                type="button"
                onClick={() => onSelectMember(member.userId)}
                onMouseEnter={() => setHoveredUserId(member.userId)}
                onMouseLeave={() => setHoveredUserId((current) => (current === member.userId ? null : current))}
                onFocus={() => setHoveredUserId(member.userId)}
                onBlur={() => setHoveredUserId((current) => (current === member.userId ? null : current))}
                aria-label={`${member.displayName}, ${ROLE_TITLE[member.role] ?? member.role}, ${member.departmentName ?? 'tanpa divisi'}, ${ACTIVITY_LABEL[member.activity]}${blockedNote}`}
                aria-pressed={selectedUserId === member.userId}
                data-name={member.displayName}
                className={`${btn} transition-shadow`}
                style={{
                  left: `${((px - 2) / SCENE_W) * 100}%`,
                  top: `${((py - 4) / SCENE_H) * 100}%`,
                  width: `${((CHAR_W + 4) / SCENE_W) * 100}%`,
                  height: `${((CHAR_H + 6) / SCENE_H) * 100}%`,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Zoom control: integer steps keep every art pixel a perfect square */}
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-[8px] border-2 border-[#26314b] bg-[#fdf8ec] p-1 text-xs text-[#26314b] shadow-[0_3px_0_#26314b]">
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= 1}
          aria-label="Perkecil tampilan kantor"
          className="h-6 w-6 rounded-[4px] font-bold hover:bg-[#e8e0c9] disabled:opacity-40"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom(null)}
          aria-pressed={zoom === null}
          aria-label="Sesuaikan ukuran otomatis"
          className={`h-6 rounded-[4px] px-1.5 font-bold hover:bg-[#e8e0c9] ${zoom === null ? 'text-[#1d6f56]' : ''}`}
        >
          {scale}×{zoom === null ? ' auto' : ''}
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          aria-label="Perbesar tampilan kantor"
          className="h-6 w-6 rounded-[4px] font-bold hover:bg-[#e8e0c9] disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}

const ROLE_TITLE: Record<string, string> = {
  owner: 'Ketua',
  admin: 'Sekretaris/Admin',
  lead: 'Ketua divisi',
  member: 'Anggota',
  viewer: 'Tamu/Pengamat',
}
