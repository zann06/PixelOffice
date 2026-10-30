/**
 * Real-clock day cycle and office hours.
 *
 * Presence honesty (docs/PRD.md §10): the scene must not imply presence that
 * is not backed by data. Characters are only shown during the organization's
 * working hours (Mon–Fri 08.00–18.00) — outside them the office is honestly
 * empty, with an explanatory note on the scene.
 */

export type DayPhase = 'pagi' | 'siang' | 'sore' | 'malam'

/** Real-clock phase: pagi 05–10, siang 10–15, sore 15–19, malam 19–05. */
export function phaseForHour(hour: number): DayPhase {
  if (hour >= 5 && hour < 10) return 'pagi'
  if (hour >= 10 && hour < 15) return 'siang'
  if (hour >= 15 && hour < 19) return 'sore'
  return 'malam'
}

/** The organization's working hours: Monday–Friday, 08.00–18.00. */
export function isWorkingHours(now: Date): boolean {
  const day = now.getDay() // 0 = Sunday
  const hour = now.getHours()
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18
}

// ---------------------------------------------------------------------------
// Smooth (continuous) day cycle — drives scene lighting every frame so the
// transition pagi → siang → sore → malam is gradual instead of a hard switch.
// ---------------------------------------------------------------------------

/** Representative hour for each phase (used by the lighting preview). */
export const PHASE_HOUR: Record<DayPhase, number> = { pagi: 7.5, siang: 12.5, sore: 17, malam: 21.5 }

/** Fractional hour (0–24) of a Date, e.g. 13:30 → 13.5. */
export function fractionalHour(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
}

type Key = readonly [hour: number, r: number, g: number, b: number, a: number]

/** Ambient tint keyframes: [hour, r, g, b, alpha]. First/last match so 24h wraps. */
const AMBIENT: readonly Key[] = [
  [0, 12, 20, 56, 0.52],
  [4.5, 18, 28, 70, 0.48],
  [5.5, 120, 110, 170, 0.28], // fajar
  [6.5, 255, 176, 130, 0.14], // matahari terbit
  [8, 255, 236, 190, 0.06],
  [11, 255, 255, 240, 0],
  [14.5, 255, 248, 225, 0.03],
  [16.5, 255, 190, 110, 0.12],
  [18, 255, 140, 90, 0.2], // senja
  [19, 90, 70, 130, 0.34],
  [20.5, 14, 22, 60, 0.48],
  [24, 12, 20, 56, 0.52],
]

export interface DayLight {
  /** Ambient tint colour + alpha laid over the whole scene. */
  tint: { r: number; g: number; b: number; a: number }
  /** 0 (full daylight) … 1 (deep night). */
  darkness: number
  /** 0…1 how strongly interior lamps / window glow should shine. */
  lamps: number
  /** 0…1 star visibility. */
  stars: number
  /** 0…1 sunlight strength (for cloud shadows, window light shafts). */
  sun: number
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
const smooth = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Interpolated lighting for a fractional hour. Pure, cheap, called per frame. */
export function dayLight(hour: number): DayLight {
  const h = ((hour % 24) + 24) % 24
  let i = 0
  while (i < AMBIENT.length - 2 && h >= AMBIENT[i + 1]![0]) i++
  const a = AMBIENT[i]!
  const b = AMBIENT[i + 1]!
  const t = smooth(0, 1, (h - a[0]) / (b[0] - a[0]))
  const mix = (k: 1 | 2 | 3 | 4): number => a[k] + (b[k] - a[k]) * t
  const alpha = mix(4)
  // lamps: on from dusk until after sunrise, with a soft ramp either side
  const lamps = Math.max(smooth(16.5, 19.5, h), 1 - smooth(5.5, 7.5, h))
  const night = Math.max(smooth(18.5, 20.5, h), 1 - smooth(4.5, 6, h))
  return {
    tint: { r: Math.round(mix(1)), g: Math.round(mix(2)), b: Math.round(mix(3)), a: alpha },
    darkness: clamp01(night),
    lamps: clamp01(lamps),
    stars: clamp01(night * 1.1 - 0.1),
    sun: clamp01(smooth(6, 9, h) * (1 - smooth(16, 18.5, h))),
  }
}

/** "Pagi", "Siang"… plus a friendly hint for the HUD. */
export function phaseHint(phase: DayPhase): string {
  return { pagi: 'Cahaya hangat masuk dari jendela', siang: 'Terang benderang', sore: 'Senja, lampu mulai menyala', malam: 'Lampu kantor menyala' }[phase]
}
