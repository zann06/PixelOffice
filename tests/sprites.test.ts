import { describe, expect, it } from 'vitest'
import {
  CHAR_BODY_IDLE,
  CHAR_BODY_WALK_A,
  CHAR_BODY_WALK_B,
  CHAR_BODY_WORK,
  CHAR_HEADS,
  CHAR_H,
  CHAR_HEAD_H,
  CHAR_W,
  characterPalette,
  shadeHex,
} from '../src/features/pixel-office/sprites'

/**
 * Sprite grid integrity: the renderer composes a head matrix with a body
 * matrix, so every row must be exactly CHAR_W wide and the two parts must add
 * up to CHAR_H. A typo here would silently clip characters on the canvas.
 */

const BODIES = {
  idle: CHAR_BODY_IDLE,
  work: CHAR_BODY_WORK,
  walkA: CHAR_BODY_WALK_A,
  walkB: CHAR_BODY_WALK_B,
}

function assertMatrix(rows: string[], expectedRows: number, label: string) {
  expect(rows.length, `${label} row count`).toBe(expectedRows)
  rows.forEach((row, index) => {
    expect(row.length, `${label} row ${index} width`).toBe(CHAR_W)
    expect(row, `${label} row ${index} uses known keys`).toMatch(/^[.ohHseStTwWpPbBm]+$/)
  })
}

describe('character sprites', () => {
  it('head variants all match the sprite grid', () => {
    CHAR_HEADS.forEach((head, index) => assertMatrix(head, CHAR_HEAD_H, `head ${index}`))
  })

  it('every body pose matches the sprite grid and total height', () => {
    expect(CHAR_HEAD_H + CHAR_BODY_IDLE.length).toBe(CHAR_H)
    for (const [label, body] of Object.entries(BODIES)) assertMatrix(body, CHAR_H - CHAR_HEAD_H, label)
  })

  it('palette covers every letter used by the sprites', () => {
    const palette = characterPalette({ hair: '#5b3a24', skin: '#e6b27d', shirt: '#4f8ff7', pants: '#39415a', shoe: '#222b36', eye: '#1a1d24' })
    const letters = new Set<string>()
    for (const rows of [...CHAR_HEADS, ...Object.values(BODIES)]) {
      for (const row of rows) for (const char of row) if (char !== '.') letters.add(char)
    }
    for (const letter of letters) {
      expect(palette[letter], `palette entry for "${letter}"`).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('shadeHex darkens and lightens deterministically', () => {
    expect(shadeHex('#808080', -0.5)).toBe('#404040')
    expect(shadeHex('#808080', 0.5)).toBe('#c0c0c0')
    expect(shadeHex('not-a-color', -0.5)).toBe('not-a-color')
  })
})
