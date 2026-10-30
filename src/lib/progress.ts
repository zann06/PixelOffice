import type { Program, Task } from '../types/data'

/**
 * Progress calculation — the single documented rule (docs/PRD.md §8):
 *
 *   progress = done tasks / (all tasks - cancelled tasks)
 *
 * Tasks without a program are excluded (they belong to no program progress).
 * A program with zero non-cancelled tasks has NO derived progress value yet —
 * we must not invent a percentage; the UI shows "Belum ada tugas".
 */
export interface ProgramProgress {
  /** null when the program has no non-cancelled tasks. */
  percent: number | null
  done: number
  total: number
  cancelled: number
}

export function programProgress(program: Program, tasks: Task[]): ProgramProgress {
  const scoped = tasks.filter((t) => t.programId === program.id)
  const cancelled = scoped.filter((t) => t.status === 'cancelled').length
  const total = scoped.length - cancelled
  const done = scoped.filter((t) => t.status === 'done').length
  return {
    percent: total === 0 ? null : Math.round((done / total) * 100),
    done,
    total,
    cancelled,
  }
}

export function isTaskOverdue(task: Task, now: Date): boolean {
  if (task.status === 'done' || task.status === 'cancelled') return false
  if (!task.dueAt) return false
  return new Date(task.dueAt).getTime() < now.getTime()
}

/** Workspace-level task completion for dashboard metrics. */
export function workspaceTaskCompletion(tasks: Task[]): ProgramProgress {
  const cancelled = tasks.filter((t) => t.status === 'cancelled').length
  const total = tasks.length - cancelled
  const done = tasks.filter((t) => t.status === 'done').length
  return {
    percent: total === 0 ? null : Math.round((done / total) * 100),
    done,
    total,
    cancelled,
  }
}
