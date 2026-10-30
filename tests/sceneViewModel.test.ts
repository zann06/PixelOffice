import { describe, expect, it } from 'vitest'
import { buildSceneViewModel, isMeetingLive, taskActivityFor } from '../src/features/pixel-office/sceneViewModel'
import {
  AULA_SEATS,
  HUMAS_SEATS,
  KEUANGAN_SEATS,
  KETUA_SEATS,
  MEETING_SEATS,
  WORKSPACE_SEATS,
} from '../src/features/pixel-office/officeMap'
import type { Task, TaskStatus, WorkspaceSnapshot } from '../src/types/data'
import { buildSeedDatabase, WORKSPACE_A } from '../src/lib/data/seed'

/**
 * Scene rules under test (docs/PRD.md §10): the scene is a pure visualization
 * of saved data — it must never invent presence or activity.
 */

function snapshotFromSeed(now: Date): WorkspaceSnapshot {
  const db = buildSeedDatabase(now)
  return {
    workspace: db.workspaces[0]!,
    profiles: Object.fromEntries(db.profiles.map((p) => [p.id, p])),
    memberships: db.memberships.filter((m) => m.workspaceId === WORKSPACE_A),
    departments: db.departments.filter((d) => d.workspaceId === WORKSPACE_A),
    programs: db.programs.filter((p) => p.workspaceId === WORKSPACE_A),
    tasks: db.tasks.filter((t) => t.workspaceId === WORKSPACE_A),
    meetings: db.meetings.filter((m) => m.workspaceId === WORKSPACE_A),
    attendees: db.attendees,
    decisions: db.decisions.filter((d) => d.workspaceId === WORKSPACE_A),
    activity: db.activity.filter((a) => a.workspaceId === WORKSPACE_A),
    comments: db.comments.filter((c) => c.workspaceId === WORKSPACE_A),
    fetchedAt: now.toISOString(),
  }
}

describe('buildSceneViewModel', () => {
  const now = new Date('2026-10-29T10:00:00')

  it('maps members deterministically: departments get desks, others lounge', () => {
    const vm = buildSceneViewModel(snapshotFromSeed(now), now)
    const andi = vm.members.find((m) => m.userId === 'u-andi')!
    expect(andi.departmentName).toBe('Teknologi')
    expect(WORKSPACE_SEATS).toContainEqual(andi.seat)

    const anton = vm.members.find((m) => m.userId === 'u-anton')!
    expect(anton.departmentId).toBeNull()

    // Desk assignment is deterministic across builds with equal input.
    const vm2 = buildSceneViewModel(snapshotFromSeed(now), now)
    expect(vm.members.map((m) => m.seat)).toEqual(vm2.members.map((m) => m.seat))
  })

  it('derives activity purely from assigned task statuses', () => {
    const vm = buildSceneViewModel(snapshotFromSeed(now), now)
    const andi = vm.members.find((m) => m.userId === 'u-andi')!
    // Andi has an in_progress task (t-web-3) and a blocked one (t-gl-3) → blocked wins.
    expect(andi.activity).toBe('blocked')

    const maya = vm.members.find((m) => m.userId === 'u-maya')!
    // Maya: one in_progress task (t-ev-decision)… plus todo/overdue — working.
    expect(['working', 'idle']).toContain(maya.activity)

    const viewer = vm.members.find((m) => m.userId === 'u-anton')!
    expect(viewer.activity).toBe('idle')
  })

  it('places only live-meeting attendees in the meeting room', () => {
    const vm = buildSceneViewModel(snapshotFromSeed(now), now)
    // Seed creates "Rapat Koordinasi Mingguan" live around seed time.
    expect(vm.liveMeetings.length).toBeGreaterThan(0)
    const ratna = vm.members.find((m) => m.userId === 'u-ratna')!
    expect(ratna.activity).toBe('meeting')
    expect(ratna.seat).toEqual(MEETING_SEATS[0])

    // Attendee count must not exceed meeting seats.
    const inMeeting = vm.members.filter((m) => m.activity === 'meeting')
    expect(inMeeting.length).toBeLessThanOrEqual(MEETING_SEATS.length)
  })

  it('with no live meeting, every department sits in its own room', () => {
    const later = new Date('2026-10-29T20:00:00')
    const vm = buildSceneViewModel(snapshotFromSeed(now), later)
    expect(vm.liveMeetings).toHaveLength(0)
    expect(vm.members.every((m) => m.activity !== 'meeting')).toBe(true)

    const byUser = new Map(vm.members.map((m) => [m.userId, m]))
    // BPH (owner/admin) → Ruang Ketua
    expect(KETUA_SEATS).toContainEqual(byUser.get('u-bima')!.seat)
    // Keuangan → ruang Keuangan
    expect(KEUANGAN_SEATS).toContainEqual(byUser.get('u-laras')!.seat)
    // Humas & Media → ruang Humas
    expect(HUMAS_SEATS).toContainEqual(byUser.get('u-maya')!.seat)
    // Acara + tanpa divisi → Aula (no seat collisions, sequential pool)
    expect(AULA_SEATS).toContainEqual(byUser.get('u-dewi')!.seat)
    expect(AULA_SEATS).toContainEqual(byUser.get('u-bagus')!.seat)
    expect(AULA_SEATS).toContainEqual(byUser.get('u-anton')!.seat)
    expect(new Set([byUser.get('u-dewi')!.seat, byUser.get('u-bagus')!.seat, byUser.get('u-anton')!.seat]).size).toBe(3)
    // Teknologi/Desain → Workspace desks
    expect(WORKSPACE_SEATS).toContainEqual(byUser.get('u-fajar')!.seat)
    expect(WORKSPACE_SEATS).toContainEqual(byUser.get('u-putri')!.seat)
  })

  it('mirrors program statuses onto the project board (max 8)', () => {
    const vm = buildSceneViewModel(snapshotFromSeed(now), now)
    expect(vm.boardPrograms.length).toBeLessThanOrEqual(8)
    expect(vm.boardPrograms.length).toBeGreaterThan(0)
  })
})

describe('isMeetingLive', () => {
  it('is bounded by the saved window', () => {
    expect(isMeetingLive('2026-10-29T09:00:00Z', '2026-10-29T10:00:00Z', new Date('2026-10-29T09:30:00Z'))).toBe(true)
    expect(isMeetingLive('2026-10-29T09:00:00Z', '2026-10-29T10:00:00Z', new Date('2026-10-29T10:00:00Z'))).toBe(false)
    expect(isMeetingLive('2026-10-29T09:00:00Z', '2026-10-29T10:00:00Z', new Date('2026-10-29T08:59:59Z'))).toBe(false)
  })
})

describe('taskActivityFor', () => {
  const t = (status: TaskStatus) => ({ id: 'x', status }) as Task
  it('blocked beats working beats review beats idle', () => {
    expect(taskActivityFor([t('in_progress'), t('blocked')])).toBe('blocked')
    expect(taskActivityFor([t('in_progress'), t('in_review')])).toBe('working')
    expect(taskActivityFor([t('in_review')])).toBe('in_review')
    expect(taskActivityFor([t('done'), t('todo')])).toBe('idle')
  })
})
