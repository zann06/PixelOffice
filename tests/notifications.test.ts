import { describe, expect, it } from 'vitest'
import { buildNotifications, notificationCount } from '../src/lib/notifications'
import type { Task } from '../src/types/data'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    workspaceId: 'ws1',
    programId: null,
    departmentId: null,
    title: 'Tugas uji',
    description: null,
    status: 'todo',
    priority: 'normal',
    assigneeUserId: null,
    createdBy: 'u1',
    dueAt: null,
    blockedReason: null,
    recurrence: null,
    decisionId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  }
}

const NOW = new Date(2026, 9, 30, 10, 0) // Sabtu 30 Okt 2026, 10.00 — bukan jam kerja

function meetingInDays(days: number, hour = 9) {
  return {
    id: `m${days}`,
    workspaceId: 'ws1',
    departmentId: null,
    title: `Rapat +${days}h`,
    startsAt: new Date(2026, 9, 30 + days, hour, 0).toISOString(),
    endsAt: null,
    meetingUrl: null,
    agenda: null,
    notes: null,
    createdBy: 'u1',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  }
}

describe('buildNotifications — derivation from saved data', () => {
  it('groups overdue, due today/tomorrow, and meetings within 2 days', () => {
    const tasks = [
      task({ id: 'a', title: 'Terlambat', dueAt: new Date(2026, 9, 28, 17).toISOString() }),
      task({ id: 'b', title: 'Hari ini', dueAt: new Date(2026, 9, 30, 17).toISOString() }),
      task({ id: 'c', title: 'Besok', dueAt: new Date(2026, 9, 31, 17).toISOString() }),
      task({ id: 'd', title: 'Selesai tetap dihitung?', dueAt: new Date(2026, 9, 28, 17).toISOString(), status: 'done' }),
      task({ id: 'e', title: 'Tanpa tenggat' }),
    ]
    const items = buildNotifications(tasks, [meetingInDays(0), meetingInDays(1), meetingInDays(5)], NOW)
    const kinds = items.map((i) => i.kind)
    expect(kinds).toContain('overdue')
    expect(kinds).toContain('due-today')
    expect(kinds).toContain('due-tomorrow')
    expect(kinds).toContain('meeting-today')
    expect(kinds).toContain('meeting-soon')
    // done tasks never appear; meetings beyond 2 days are excluded
    expect(items.find((i) => i.title === 'Selesai tetap dihitung?')).toBeUndefined()
    expect(items.find((i) => i.title === 'Tanpa tenggat')).toBeUndefined()
    expect(items.find((i) => i.title === 'Rapat +5h')).toBeUndefined()
  })

  it('counts every item exactly once for the bell badge', () => {
    const tasks = [task({ dueAt: new Date(2026, 9, 28, 17).toISOString() })]
    const meetings = [meetingInDays(0)]
    expect(notificationCount(tasks, meetings, NOW)).toBe(buildNotifications(tasks, meetings, NOW).length)
  })
})
