/** Formatting helpers. UI language is Indonesian (docs/REFERENCE.md). */

const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(iso: string | Date): string {
  return dateTimeFormat.format(new Date(iso))
}

export function formatDate(iso: string | Date): string {
  return dateFormat.format(new Date(iso))
}

export function formatTime(iso: string | Date): string {
  return timeFormat.format(new Date(iso))
}

/** "Terakhir diperbarui" style relative label. */
export function formatRelative(iso: string | number | Date, now: Date = new Date()): string {
  const t = new Date(iso).getTime()
  const diffMs = now.getTime() - t
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  return `${days} hari lalu`
}

export function formatDueLabel(dueAt: string | null, now: Date): string | null {
  if (!dueAt) return null
  const due = new Date(dueAt)
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayDiff = Math.round((startOfDue.getTime() - startOfNow.getTime()) / 86400000)
  if (dayDiff < -1) return `Terlambat ${Math.abs(dayDiff)} hari`
  if (dayDiff === -1) return 'Terlambat 1 hari'
  if (dayDiff === 0) return 'Tenggat hari ini'
  if (dayDiff === 1) return 'Tenggat besok'
  if (dayDiff <= 7) return `Tenggat ${dayDiff} hari lagi`
  return formatDate(due)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
