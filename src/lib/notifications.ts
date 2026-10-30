import type { Meeting, Task } from '../types/data'
import { isTaskOverdue } from './progress'

/**
 * In-app notification center derivation (pure, from saved data only):
 * overdue tasks, tasks due today/tomorrow, and upcoming meetings within 2 days.
 * No backend push — this is an honest local view of the same snapshot the rest
 * of the app reads.
 */

export interface NotificationItem {
  key: string
  kind: 'overdue' | 'due-today' | 'due-tomorrow' | 'meeting-today' | 'meeting-soon'
  title: string
  detail: string
  route: 'tugas' | 'rapat'
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export function buildNotifications(tasks: Task[], meetings: Meeting[], now: Date): NotificationItem[] {
  const items: NotificationItem[] = []
  const todayStart = dayStart(now)

  const open = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled' && t.dueAt)
  for (const task of open) {
    const due = dayStart(new Date(task.dueAt!))
    const diff = Math.round((due - todayStart) / 86400000)
    if (diff < 0) {
      items.push({
        key: `overdue-${task.id}`,
        kind: 'overdue',
        title: task.title,
        detail: `Terlambat ${Math.abs(diff)} hari`,
        route: 'tugas',
      })
    } else if (diff === 0) {
      items.push({ key: `today-${task.id}`, kind: 'due-today', title: task.title, detail: 'Jatuh tempo hari ini', route: 'tugas' })
    } else if (diff === 1) {
      items.push({ key: `tomorrow-${task.id}`, kind: 'due-tomorrow', title: task.title, detail: 'Jatuh tempo besok', route: 'tugas' })
    }
  }

  for (const meeting of meetings) {
    const start = new Date(meeting.startsAt)
    const diff = Math.round((dayStart(start) - todayStart) / 86400000)
    const sameDay = dayStart(start) === todayStart
    if (sameDay) {
      items.push({ key: `meet-${meeting.id}`, kind: 'meeting-today', title: meeting.title, detail: 'Rapat hari ini', route: 'rapat' })
    } else if (diff === 1 || diff === 2) {
      items.push({ key: `meet-${meeting.id}`, kind: 'meeting-soon', title: meeting.title, detail: `Rapat ${diff === 1 ? 'besok' : 'lusa'}`, route: 'rapat' })
    }
  }

  return items
}

/** Count badge for the bell icon. */
export function notificationCount(tasks: Task[], meetings: Meeting[], now: Date): number {
  return buildNotifications(tasks, meetings, now).length
}

export { isTaskOverdue }
