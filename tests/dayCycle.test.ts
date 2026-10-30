import { describe, expect, it } from 'vitest'
import { isWorkingHours, phaseForHour } from '../src/features/pixel-office/dayCycle'

describe('phaseForHour — real-clock day cycle', () => {
  it('maps hours to phases with the documented boundaries', () => {
    expect(phaseForHour(5)).toBe('pagi')
    expect(phaseForHour(9)).toBe('pagi')
    expect(phaseForHour(10)).toBe('siang')
    expect(phaseForHour(14)).toBe('siang')
    expect(phaseForHour(15)).toBe('sore')
    expect(phaseForHour(18)).toBe('sore')
    expect(phaseForHour(19)).toBe('malam')
    expect(phaseForHour(23)).toBe('malam')
    expect(phaseForHour(3)).toBe('malam')
    expect(phaseForHour(4)).toBe('malam')
  })
})

describe('isWorkingHours — presence honesty (docs/PRD.md §10)', () => {
  const at = (day: number, hour: number) => new Date(2026, 9, 25 + day, hour, 0)
  // 2026-10-25 is a Sunday; 26 Monday … 31 Saturday.

  it('is true during Monday–Friday 08.00–17.59', () => {
    expect(isWorkingHours(at(1, 8))).toBe(true)
    expect(isWorkingHours(at(1, 12))).toBe(true)
    expect(isWorkingHours(at(1, 17))).toBe(true)
    expect(isWorkingHours(at(5, 9))).toBe(true)
  })

  it('is false before 08.00 and from 18.00', () => {
    expect(isWorkingHours(at(1, 7))).toBe(false)
    expect(isWorkingHours(at(1, 18))).toBe(false)
    expect(isWorkingHours(at(1, 23))).toBe(false)
  })

  it('is false on weekends', () => {
    expect(isWorkingHours(at(0, 12))).toBe(false) // Sunday
    expect(isWorkingHours(at(6, 12))).toBe(false) // Saturday
  })
})
