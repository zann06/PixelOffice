import { describe, expect, it } from 'vitest'
import {
  CHAR_H,
  CHAR_W,
  HAIR_STYLES,
  characterPalette,
  characterSprite,
  shadeHex,
  type CharacterPose,
  type CharacterRole,
} from '../src/features/pixel-office/sprites'

/**
 * Sprite integrity: `characterSprite` composes head + body + role overlay
 * procedurally. Every combination must produce a full-height, full-width grid
 * whose every non-transparent pixel has a palette entry — otherwise the
 * renderer would silently clip characters or paint undefined colors.
 */

const POSES: CharacterPose[] = ['idle', 'work', 'walkA', 'walkB']
const ROLES: CharacterRole[] = ['member', 'owner', 'admin', 'viewer']

describe('character sprites (procedural composition)', () => {
  it('composes full-height, full-width grids for every hair style, pose, and role', () => {
    for (let head = 0; head < HAIR_STYLES; head++) {
      for (const pose of POSES) {
        for (const role of ROLES) {
          const rows = characterSprite(head, pose, role)
          expect(rows.length, `head ${head} pose ${pose} role ${role} row count`).toBe(CHAR_H)
          rows.forEach((row, index) => {
            expect(row.length, `head ${head} pose ${pose} row ${index} width`).toBe(CHAR_W)
          })
        }
      }
    }
  })

  it('palette covers every letter used by any sprite variant', () => {
    const palette = characterPalette({
      hair: '#5b3a24',
      skin: '#e6b27d',
      shirt: '#4f8ff7',
      pants: '#39415a',
      shoe: '#222b36',
      eye: '#1a1d24',
    })
    const letters = new Set<string>()
    for (let head = 0; head < HAIR_STYLES; head++) {
      for (const pose of POSES) {
        for (const role of ROLES) {
          for (const row of characterSprite(head, pose, role)) {
            for (const char of row) if (char !== '.') letters.add(char)
          }
        }
      }
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
