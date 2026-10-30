import type { Role, Task, WorkspaceSnapshot } from '../../types/data'
import { formatTime } from '../../lib/format'
import { programProgress } from '../../lib/progress'
import { appearanceFor, type CharacterColors } from './sprites'
import {
  AULA_SEATS,
  HUMAS_SEATS,
  KETUA_SEATS,
  KEUANGAN_SEATS,
  MEETING_SEATS,
  WORKSPACE_SEATS,
  type Seat,
} from './officeMap'

/**
 * Scene view model (docs/ARCHITECTURE.md: "PixelOfficeScene should consume a
 * view model, not own task/workspace data access").
 *
 * Every visual below is DERIVED FROM SAVED DATA — the scene never invents
 * presence, activity, or success (docs/PRD.md §10):
 *
 * - A member with a department sits at a Workspace desk (deterministic seat
 *   order). Members without a department sit in the Lounge.
 * - A member who is an attendee of a meeting whose saved window contains
 *   `now` sits in the Ruang Meeting for that window only.
 * - `working`  → at least one assigned task with status in_progress.
 * - `blocked`  → at least one assigned task with status blocked (takes
 *   precedence, it is the urgent state).
 * - `in_review`→ has a task in_review but none blocked/in_progress.
 * - `idle`     → no active assigned task. Never rendered as fake typing.
 * - The Project Board stickies mirror live program statuses.
 */

export type SceneActivity = 'idle' | 'working' | 'blocked' | 'in_review' | 'meeting'

export interface SceneMemberVM {
  userId: string
  displayName: string
  role: Role
  departmentId: string | null
  departmentName: string | null
  seat: Seat
  /** Deterministic hair/head variant (0-2) per member. */
  headIndex: number
  activity: SceneActivity
  activeTaskCount: number
  blockedTaskCount: number
  reviewTaskCount: number
  colors: CharacterColors
}

export interface SceneLiveMeeting {
  id: string
  title: string
  attendeeIds: string[]
}

export interface CorridorDisplay {
  title: string
  timeLabel: string
  live: boolean
}

export interface SceneViewModel {
  members: SceneMemberVM[]
  liveMeetings: SceneLiveMeeting[]
  /** Programs pinned on the Project Board; percent follows the documented progress rule (null = no tasks yet). */
  boardPrograms: { status: string; percent: number | null }[]
  /** Real meeting shown on the corridor display screen. */
  corridorDisplay: CorridorDisplay | null
  /** Active program promoted on the stage backdrop banner. */
  stageProgram: string | null
  /** Derived progress of the stage program (null = unknown, never invented). */
  stageProgress: number | null
  /** Announcement-board pins derived from real workspace activity. */
  activityPins: { blocked: number; events: number }
  generatedAt: string
}

export const DEPARTMENT_SHIRT_COLORS: Record<string, string> = {
  'BPH & Sekretariat': '#5b6a94',
  Teknologi: '#4f8ff7',
  Desain: '#e37fb0',
  Acara: '#f0a04b',
  'Humas & Media': '#58c47c',
  Keuangan: '#d9a520',
}
const DEFAULT_SHIRT = '#9aa5b5'

export function isMeetingLive(startsAt: string, endsAt: string | null, now: Date): boolean {
  const start = new Date(startsAt).getTime()
  const end = endsAt ? new Date(endsAt).getTime() : start + 3600_000
  return start <= now.getTime() && now.getTime() < end
}

export function taskActivityFor(tasks: Task[]): SceneActivity {
  const mine = tasks
  if (mine.some((t) => t.status === 'blocked')) return 'blocked'
  if (mine.some((t) => t.status === 'in_progress')) return 'working'
  if (mine.some((t) => t.status === 'in_review')) return 'in_review'
  return 'idle'
}

export function buildSceneViewModel(snapshot: WorkspaceSnapshot, now: Date): SceneViewModel {
  const departmentNames = new Map(snapshot.departments.map((d) => [d.id, d.name]))
  const tasksByAssignee = new Map<string, Task[]>()
  for (const task of snapshot.tasks) {
    if (!task.assigneeUserId) continue
    const list = tasksByAssignee.get(task.assigneeUserId) ?? []
    list.push(task)
    tasksByAssignee.set(task.assigneeUserId, list)
  }

  // Live meetings and their attendee set.
  const liveMeetings: SceneLiveMeeting[] = snapshot.meetings
    .filter((m) => isMeetingLive(m.startsAt, m.endsAt, now))
    .map((m) => ({
      id: m.id,
      title: m.title,
      attendeeIds: snapshot.attendees.filter((a) => a.meetingId === m.id).map((a) => a.userId),
    }))
  const meetingSeatByUser = new Map<string, Seat>()
  let meetingSeatIndex = 0
  for (const meeting of liveMeetings) {
    for (const attendeeId of meeting.attendeeIds) {
      if (meetingSeatByUser.has(attendeeId)) continue
      meetingSeatByUser.set(attendeeId, MEETING_SEATS[meetingSeatIndex % MEETING_SEATS.length] ?? MEETING_SEATS[0]!)
      meetingSeatIndex++
    }
  }

  // Deterministic seat assignment: each department maps to its own room's
  // seat pool (docs/IMPLEMENTATION_NOTES.md). One counter per POOL so two
  // departments sharing a room (Acara + tanpa divisi → Aula) never collide.
  const poolCounters = new Map<string, number>()
  const nextSeat = (poolKey: string, pool: Seat[]): Seat => {
    const index = poolCounters.get(poolKey) ?? 0
    poolCounters.set(poolKey, index + 1)
    return pool[index % pool.length] ?? pool[0]!
  }

  const members: SceneMemberVM[] = snapshot.memberships.map((membership) => {
    const profile = snapshot.profiles[membership.userId]
    const displayName = profile?.displayName ?? 'Anggota'
    const departmentId = departmentIdOf(snapshot, membership.userId, membership.role)
    const myTasks = tasksByAssignee.get(membership.userId) ?? []
    const counts = {
      activeTaskCount: myTasks.filter((t) => t.status === 'in_progress').length,
      blockedTaskCount: myTasks.filter((t) => t.status === 'blocked').length,
      reviewTaskCount: myTasks.filter((t) => t.status === 'in_review').length,
    }

    const meetingSeat = meetingSeatByUser.get(membership.userId)
    let seat: Seat
    let activity: SceneActivity
    if (meetingSeat) {
      seat = meetingSeat
      activity = 'meeting'
    } else {
      const deptName = departmentId ? departmentNames.get(departmentId) ?? null : null
      const pool = seatPoolForDepartment(deptName)
      seat = nextSeat(pool.key, pool.seats)
      activity = taskActivityFor(myTasks)
    }

    const appearance = appearanceFor(membership.userId)
    const deptName = departmentId ? departmentNames.get(departmentId) ?? null : null
    return {
      userId: membership.userId,
      displayName,
      role: membership.role,
      departmentId,
      departmentName: deptName,
      seat,
      headIndex: appearance.headIndex,
      activity,
      ...counts,
      colors: {
        ...appearance,
        shirt: deptName ? DEPARTMENT_SHIRT_COLORS[deptName] ?? DEFAULT_SHIRT : DEFAULT_SHIRT,
        eye: '#1a1d24',
      },
    }
  })

  const boardPrograms = snapshot.programs
    .filter((p) => p.status !== 'archived')
    .slice(0, 8)
    .map((p) => ({ status: p.status, percent: programProgress(p, snapshot.tasks).percent }))

  // Corridor display: the live meeting, else the next upcoming one.
  const live = liveMeetings[0]
  const upcoming = snapshot.meetings
    .filter((m) => new Date(m.startsAt).getTime() > now.getTime())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const source = live ? snapshot.meetings.find((m) => m.id === live.id) : upcoming
  const corridorDisplay: CorridorDisplay | null = source
    ? {
        title: source.title,
        timeLabel: source.endsAt
          ? `${formatTime(source.startsAt)}–${formatTime(source.endsAt)}`
          : formatTime(source.startsAt),
        live: Boolean(live),
      }
    : null

  // Stage banner promotes the active program of the Acara department, else any
  // active program — real saved data on the backdrop.
  const acaraDept = snapshot.departments.find((d) => /acara/i.test(d.name))
  const stageSource =
    snapshot.programs.find((p) => p.status === 'active' && acaraDept && p.departmentId === acaraDept.id) ??
    snapshot.programs.find((p) => p.status === 'active') ??
    null
  const stageProgram = stageSource?.title ?? null
  const stageProgress = stageSource ? programProgress(stageSource, snapshot.tasks).percent : null

  const activityPins = {
    blocked: snapshot.tasks.filter((t) => t.status === 'blocked').length,
    events: snapshot.activity.filter((a) => now.getTime() - new Date(a.createdAt).getTime() < 3 * 86400_000).length,
  }

  return { members, liveMeetings, boardPrograms, corridorDisplay, stageProgram, stageProgress, activityPins, generatedAt: now.toISOString() }
}

/**
 * Department → room seat pool. Teknologi/Desain (and unknown divisions) work
 * at the shared Workspace desks; BPH uses the Ruang Ketua; Keuangan its own
 * office; Humas & Media its media room; Acara and members without a
 * department use the Aula audience chairs.
 */
function seatPoolForDepartment(departmentName: string | null): { key: string; seats: Seat[] } {
  if (!departmentName) return { key: 'aula', seats: AULA_SEATS }
  if (/^BPH/i.test(departmentName)) return { key: 'ketua', seats: KETUA_SEATS }
  if (/Keuangan/i.test(departmentName)) return { key: 'keuangan', seats: KEUANGAN_SEATS }
  if (/Humas|Media/i.test(departmentName)) return { key: 'humas', seats: HUMAS_SEATS }
  if (/Acara/i.test(departmentName)) return { key: 'aula', seats: AULA_SEATS }
  return { key: 'workspace', seats: WORKSPACE_SEATS }
}

/**
 * Department assignment for scene seats. Leads own their department;
 * owner/admin belong to the BPH department when one exists; plain members are
 * inferred from an assigned task's department (demo dataset has no explicit
 * member→department column — documented in docs/IMPLEMENTATION_NOTES.md).
 * Viewers have no department and sit in the Aula.
 */
function departmentIdOf(snapshot: WorkspaceSnapshot, userId: string, role: Role): string | null {
  const department = snapshot.departments.find((d) => d.leadUserId === userId)
  if (department) return department.id
  if (role === 'owner' || role === 'admin') {
    const bph = snapshot.departments.find((d) => /^BPH/i.test(d.name))
    return bph?.id ?? null
  }
  if (role !== 'member') return null
  const task = snapshot.tasks.find((t) => t.assigneeUserId === userId && t.departmentId)
  return task?.departmentId ?? null
}
