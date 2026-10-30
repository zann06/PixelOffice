import { describe, expect, it } from 'vitest'
import { buildMap, findPath, isWalkable, WORKSPACE_SEATS, MEETING_SEATS, KETUA_SEATS, KEUANGAN_SEATS, HUMAS_SEATS, AULA_SEATS } from '../src/features/pixel-office/officeMap'

/**
 * Walking guarantee: characters move between seats along floor tiles only —
 * they may never cross a wall (docs/REFERENCE.md scene rules).
 */

const grid = buildMap()

function assertPathClear(from: { x: number; y: number }, to: { x: number; y: number }) {
  const path = findPath(grid, from, to)
  expect(path, `path from ${from.x},${from.y} to ${to.x},${to.y}`).not.toBeNull()
  for (const step of path!) {
    expect(isWalkable(grid[step.y]?.[step.x]), `step ${step.x},${step.y} must be walkable`).toBe(true)
  }
  expect(path!.at(-1)).toEqual(to)
}

describe('findPath — walking never crosses walls', () => {
  it('every seat has a clear path to every other seat', () => {
    const allSeats = [...WORKSPACE_SEATS, ...KETUA_SEATS, ...KEUANGAN_SEATS, ...HUMAS_SEATS, ...AULA_SEATS, ...MEETING_SEATS]
    for (const a of allSeats) {
      for (const b of allSeats) {
        if (a === b) continue
        assertPathClear({ x: a.x, y: a.y }, { x: b.x, y: b.y })
      }
    }
  })

  it('routes between bands through doorways, not walls', () => {
    // Workspace desk → Ruang Ketua crosses the row-6 wall only at a door gap.
    const path = findPath(grid, { x: 2, y: 7 }, { x: 14, y: 3 })!
    expect(path.length).toBeGreaterThan(6)
    for (const step of path) {
      expect(isWalkable(grid[step.y]?.[step.x])).toBe(true)
    }
  })

  it('returns null for wall or unreachable targets', () => {
    expect(findPath(grid, { x: 2, y: 7 }, { x: 12, y: 7 })).toBeNull() // wall tile
    expect(findPath(grid, { x: 12, y: 7 }, { x: 2, y: 7 })).toBeNull() // starting inside a wall
  })

  it('returns an empty path when already at the destination', () => {
    expect(findPath(grid, { x: 2, y: 7 }, { x: 2, y: 7 })).toEqual([])
  })
})
