import type { Meeting, Program, Task, WorkspaceSnapshot } from '../types/data'

/**
 * CSV export (PRD P0 #13). Export is prepared here but gated by the caller:
 * Settings only offers it to owner/admin/lead (docs/PRD.md §5). Values are
 * escaped defensively; cell text is data, never markup.
 */

function escapeCell(value: string | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(headers: string[], rows: (string | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  // BOM keeps Excel happy with UTF-8.
  return '\ufeff' + lines.join('\r\n')
}

export function tasksCsv(snapshot: WorkspaceSnapshot, tasks: Task[]): string {
  const name = (userId: string | null) => (userId ? snapshot.profiles[userId]?.displayName ?? '' : '')
  const programTitle = (programId: string | null) => {
    if (!programId) return ''
    return snapshot.programs.find((p) => p.id === programId)?.title ?? ''
  }
  const departmentName = (departmentId: string | null) => {
    if (!departmentId) return ''
    return snapshot.departments.find((d) => d.id === departmentId)?.name ?? ''
  }
  return toCsv(
    ['Judul', 'Program', 'Departemen', 'Status', 'Prioritas', 'Penanggung jawab', 'Tenggat', 'Dibuat'],
    tasks.map((t) => [
      t.title,
      programTitle(t.programId),
      departmentName(t.departmentId),
      t.status,
      t.priority,
      name(t.assigneeUserId),
      t.dueAt,
      t.createdAt,
    ]),
  )
}

export function programsCsv(snapshot: WorkspaceSnapshot, programs: Program[]): string {
  const name = (userId: string | null) => (userId ? snapshot.profiles[userId]?.displayName ?? '' : '')
  const departmentName = (departmentId: string) => snapshot.departments.find((d) => d.id === departmentId)?.name ?? ''
  return toCsv(
    ['Judul', 'Departemen', 'Status', 'Penanggung jawab', 'Mulai', 'Tenggat'],
    programs.map((p) => [p.title, departmentName(p.departmentId), p.status, name(p.ownerUserId), p.startDate, p.dueDate]),
  )
}

export function meetingsCsv(meetings: Meeting[]): string {
  return toCsv(
    ['Judul', 'Mulai', 'Selesai', 'Agenda', 'Catatan'],
    meetings.map((m) => [m.title, m.startsAt, m.endsAt, m.agenda, m.notes]),
  )
}

export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
