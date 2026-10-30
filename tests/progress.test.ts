import { describe, expect, it } from 'vitest'
import { isTaskOverdue, programProgress, workspaceTaskCompletion } from '../src/lib/progress'
import type { Program, Task } from '../src/types/data'

function program(overrides: Partial<Program> = {}): Program {
  return {
    id: 'p1',
    workspaceId: 'ws1',
    departmentId: 'd1',
    title: 'Program uji',
    objective: null,
    description: null,
    status: 'active',
    ownerUserId: null,
    startDate: null,
    dueDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    workspaceId: 'ws1',
    programId: 'p1',
    departmentId: 'd1',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  }
}

describe('programProgress — documented rule (docs/PRD.md §8)', () => {
  it('counts done over non-cancelled tasks only', () => {
    const p = program()
    const tasks = [
      task({ id: 'a', status: 'done' }),
      task({ id: 'b', status: 'done' }),
      task({ id: 'c', status: 'todo' }),
      task({ id: 'd', status: 'cancelled' }),
    ]
    expect(programProgress(p, tasks)).toEqual({ percent: 67, done: 2, total: 3, cancelled: 1 })
  })

  it('returns null progress when the program has no non-cancelled tasks', () => {
    const p = program()
    expect(programProgress(p, []).percent).toBeNull()
    expect(programProgress(p, [task({ status: 'cancelled' })]).percent).toBeNull()
  })

  it('ignores tasks from other programs', () => {
    const p = program()
    const tasks = [task({ id: 'a', status: 'done' }), task({ id: 'b', programId: 'other', status: 'done' })]
    expect(programProgress(p, tasks)).toEqual({ percent: 100, done: 1, total: 1, cancelled: 0 })
  })
})

describe('workspaceTaskCompletion', () => {
  it('aggregates across all tasks', () => {
    const tasks = [task({ id: 'a', status: 'done' }), task({ id: 'b', status: 'in_progress' }), task({ id: 'c', status: 'cancelled' })]
    expect(workspaceTaskCompletion(tasks)).toEqual({ percent: 50, done: 1, total: 2, cancelled: 1 })
  })
})

describe('isTaskOverdue', () => {
  const now = new Date('2026-10-29T12:00:00.000Z')

  it('flags past-due open tasks', () => {
    expect(isTaskOverdue(task({ dueAt: '2026-10-28T00:00:00.000Z' }), now)).toBe(true)
  })
  it('ignores done/cancelled even when past due', () => {
    expect(isTaskOverdue(task({ dueAt: '2026-10-28T00:00:00.000Z', status: 'done' }), now)).toBe(false)
    expect(isTaskOverdue(task({ dueAt: '2026-10-28T00:00:00.000Z', status: 'cancelled' }), now)).toBe(false)
  })
  it('ignores tasks without due date and future due dates', () => {
    expect(isTaskOverdue(task({ dueAt: null }), now)).toBe(false)
    expect(isTaskOverdue(task({ dueAt: '2026-10-30T00:00:00.000Z' }), now)).toBe(false)
  })
})
