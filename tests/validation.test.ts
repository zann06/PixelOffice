import { describe, expect, it } from 'vitest'
import { LIMITS, validateDateRange, validateHttpsUrl, validateTitle } from '../src/lib/validation'
import { ValidationError } from '../src/types/data'

describe('validateHttpsUrl (docs/SECURITY.md §8)', () => {
  it('accepts https URLs and normalizes them', () => {
    expect(validateHttpsUrl('https://meet.example.com/abc')).toBe('https://meet.example.com/abc')
  })
  it('returns null for empty input', () => {
    expect(validateHttpsUrl(null)).toBeNull()
    expect(validateHttpsUrl('   ')).toBeNull()
  })
  it('rejects javascript:, data:, http, and malformed input', () => {
    for (const bad of ["javascript:alert('x')", 'data:text/html,hi', 'http://meet.example.com/x', 'not a url']) {
      expect(() => validateHttpsUrl(bad)).toThrow(ValidationError)
    }
  })
  it('rejects embedded credentials', () => {
    expect(() => validateHttpsUrl('https://user:pass@meet.example.com/x')).toThrow(/kredensial/)
  })
})

describe('validateTitle', () => {
  it('trims and accepts normal titles', () => {
    expect(validateTitle('  Website Organisasi ')).toBe('Website Organisasi')
  })
  it('enforces length limits', () => {
    expect(() => validateTitle('ab')).toThrow(/minimal/)
    expect(() => validateTitle('x'.repeat(LIMITS.titleMax + 1))).toThrow(/maksimal/)
  })
})

describe('validateDateRange', () => {
  it('requires end after start', () => {
    const ok = validateDateRange('2026-10-29T09:00:00Z', '2026-10-29T10:00:00Z')
    expect(ok.endsAt).not.toBeNull()
    expect(() => validateDateRange('2026-10-29T10:00:00Z', '2026-10-29T09:00:00Z')).toThrow(/setelah/)
    expect(() => validateDateRange('not-a-date', null)).toThrow(/mulai/)
  })
})
