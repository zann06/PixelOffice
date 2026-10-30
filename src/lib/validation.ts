import { ValidationError } from '../types/data'

/**
 * Shared input validation (docs/SECURITY.md §5). Used by forms AND re-checked
 * inside the data adapter — client-side validation is UX, not a boundary.
 */

export const LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 2000,
  summaryMax: 500,
  notesMax: 8000,
  agendaMax: 4000,
  nameMax: 80,
} as const

export function validateTitle(title: string, field = 'title'): string {
  const trimmed = title.trim()
  if (trimmed.length < LIMITS.titleMin) {
    throw new ValidationError(`Judul minimal ${LIMITS.titleMin} karakter.`, field)
  }
  if (trimmed.length > LIMITS.titleMax) {
    throw new ValidationError(`Judul maksimal ${LIMITS.titleMax} karakter.`, field)
  }
  return trimmed
}

export function validateOptionalText(text: string | null | undefined, max: number, field: string, label: string): string | null {
  if (text == null) return null
  const trimmed = text.trim()
  if (trimmed === '') return null
  if (trimmed.length > max) {
    throw new ValidationError(`${label} maksimal ${max} karakter.`, field)
  }
  return trimmed
}

/**
 * Meeting URLs must be https: (docs/SECURITY.md §8). Rejects javascript:,
 * data:, and any unexpected scheme. Returns null for empty input.
 */
export function validateHttpsUrl(raw: string | null | undefined, field = 'meetingUrl'): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new ValidationError('URL tidak valid.', field)
  }
  if (parsed.protocol !== 'https:') {
    throw new ValidationError('Tautan rapat harus menggunakan https://', field)
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new ValidationError('Tautan rapat tidak boleh menyematkan kredensial.', field)
  }
  return parsed.toString()
}

export function validateDateRange(startsAt: string, endsAt: string | null): { startsAt: Date; endsAt: Date | null } {
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) throw new ValidationError('Tanggal mulai tidak valid.', 'startsAt')
  let end: Date | null = null
  if (endsAt != null && endsAt !== '') {
    end = new Date(endsAt)
    if (Number.isNaN(end.getTime())) throw new ValidationError('Tanggal selesai tidak valid.', 'endsAt')
    if (end.getTime() <= start.getTime()) {
      throw new ValidationError('Waktu selesai harus setelah waktu mulai.', 'endsAt')
    }
  }
  return { startsAt: start, endsAt: end }
}

export function validateDateString(raw: string | null | undefined, field: string, label: string): string | null {
  if (raw == null || raw === '') return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) throw new ValidationError(`${label} tidak valid.`, field)
  return d.toISOString()
}
