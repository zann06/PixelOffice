import type { SceneActivity } from './sceneViewModel'

/** Shared scene wording (scene, roster, and legend must stay in sync). */
export const ACTIVITY_LABEL: Record<SceneActivity, string> = {
  idle: 'tidak ada tugas aktif',
  working: 'sedang mengerjakan tugas',
  blocked: 'memiliki tugas terhambat',
  in_review: 'menunggu review tugas',
  meeting: 'sedang rapat',
}

export const ACTIVITY_SHORT: Record<SceneActivity, string> = {
  idle: 'Idle',
  working: 'Dikerjakan',
  blocked: 'Terhambat',
  in_review: 'Menunggu review',
  meeting: 'Rapat',
}

export const ACTIVITY_COLOR: Record<SceneActivity, string> = {
  idle: 'border-border-main text-text-muted bg-surface',
  working: 'border-info/60 text-info bg-info/10',
  blocked: 'border-danger/60 text-danger bg-danger/10',
  in_review: 'border-warning/60 text-warning bg-warning/10',
  meeting: 'border-primary-strong/60 text-primary bg-primary/10',
}

/** Legend items explain every visual state (docs/DESIGN_SYSTEM.md §7). */
export const SCENE_LEGEND: { activity: SceneActivity; description: string; glyph: string }[] = [
  { activity: 'working', description: 'Punya tugas berstatus “Dikerjakan” — karakter terlihat mengetik di mejanya.', glyph: '⌨' },
  { activity: 'blocked', description: 'Punya tugas “Terhambat” — ditandai gelembung “!” merah.', glyph: '!' },
  { activity: 'in_review', description: 'Punya tugas “Menunggu review” — ditandai gelembung “?” kuning.', glyph: '?' },
  { activity: 'meeting', description: 'Peserta rapat yang sedang berlangsung — berada di Ruang Meeting.', glyph: '♦' },
  { activity: 'idle', description: 'Tidak ada tugas aktif — berada di meja divisinya atau Aula.', glyph: '·' },
]
