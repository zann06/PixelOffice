import type { Role, Task, TaskStatus, WorkspaceMember } from '../types/data'

/**
 * Permission matrix — the frontend mirror of the database policies described in
 * docs/SECURITY.md §3–4.
 *
 * IMPORTANT (docs/AGENTS.md): these checks are UX only. In the production
 * Supabase deployment the same rules must be enforced by Row Level Security
 * policies; this module also drives the local demo adapter so the demo behaves
 * like the real policy set.
 */

export type TaskAction = 'task:create' | 'task:update' | 'task:delete'
export type ProgramAction = 'program:create' | 'program:update' | 'program:archive'
export type MeetingAction = 'meeting:create' | 'meeting:update' | 'decision:create'
export type Action = TaskAction | ProgramAction | MeetingAction

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  member: 1,
  lead: 2,
  admin: 3,
  owner: 4,
}

export function atLeast(role: Role, minimum: Role): boolean {
  const rank = ROLE_RANK[role]
  const min = ROLE_RANK[minimum]
  if (rank === undefined || min === undefined) return false
  return rank >= min
}

export function roleForUser(memberships: WorkspaceMember[], workspaceId: string, userId: string): Role | null {
  const membership = memberships.find((m) => m.workspaceId === workspaceId && m.userId === userId)
  return membership ? membership.role : null
}

/** A lead may manage only records that belong to their own department. */
function leadOwnsDepartment(departmentId: string | null, ownDepartmentIds: Set<string>): boolean {
  return departmentId !== null && ownDepartmentIds.has(departmentId)
}

export interface DepartmentLike {
  id: string
  workspaceId: string
  leadUserId: string | null
}

export function departmentsLedBy(memberships: WorkspaceMember[], departments: DepartmentLike[], workspaceId: string, userId: string): Set<string> {
  const role = roleForUser(memberships, workspaceId, userId)
  if (role === 'owner' || role === 'admin') {
    return new Set(departments.filter((d) => d.workspaceId === workspaceId).map((d) => d.id))
  }
  if (role !== 'lead') return new Set()
  return new Set(departments.filter((d) => d.workspaceId === workspaceId && d.leadUserId === userId).map((d) => d.id))
}

export function can(sessionUserId: string | null, memberships: WorkspaceMember[], action: Action, context: { workspaceId: string; departmentId: string | null; task?: Task; departments: DepartmentLike[] }): { allowed: boolean; reason?: string } {
  if (!sessionUserId) return { allowed: false, reason: 'not_authenticated' }
  const role = roleForUser(memberships, context.workspaceId, sessionUserId)
  if (!role) return { allowed: false, reason: 'not_a_member' }

  const led = departmentsLedBy(memberships, context.departments, context.workspaceId, sessionUserId)

  switch (action) {
    case 'task:create':
    case 'program:create':
    case 'meeting:create':
    case 'decision:create':
      // Viewer/member read and update own work only; creation is for leads and above.
      if (atLeast(role, 'admin')) return { allowed: true }
      return leadOwnsDepartment(context.departmentId, led)
        ? { allowed: true }
        : { allowed: false, reason: 'insufficient_role' }

    case 'program:update':
    case 'meeting:update':
      if (atLeast(role, 'admin')) return { allowed: true }
      return leadOwnsDepartment(context.departmentId, led)
        ? { allowed: true }
        : { allowed: false, reason: 'insufficient_role' }

    case 'program:archive':
      return atLeast(role, 'admin') ? { allowed: true } : { allowed: false, reason: 'insufficient_role' }

    case 'task:update': {
      if (atLeast(role, 'admin')) return { allowed: true }
      const task = context.task
      if (!task) return { allowed: false, reason: 'insufficient_role' }
      // A member may always update the status of a task assigned to them.
      if (task.assigneeUserId === sessionUserId) return { allowed: true }
      return leadOwnsDepartment(task.departmentId, led)
        ? { allowed: true }
        : { allowed: false, reason: 'insufficient_role' }
    }

    case 'task:delete':
      if (atLeast(role, 'admin')) return { allowed: true }
      return context.task && leadOwnsDepartment(context.task.departmentId, led)
        ? { allowed: true }
        : { allowed: false, reason: 'insufficient_role' }
  }
}

/**
 * Fields a given user may change on a task. Members assigned to a task can
 * move its status and add a blocker reason, but cannot reassign it to someone
 * else or change its schedule.
 */
export function editableTaskFields(role: Role | null, task: Task, sessionUserId: string | null, memberships: WorkspaceMember[], departments: DepartmentLike[]): { status: boolean; description: boolean; assignee: boolean; dueAt: boolean; priority: boolean; title: boolean } {
  if (!role) {
    return { status: false, description: false, assignee: false, dueAt: false, priority: false, title: false }
  }
  if (atLeast(role, 'admin')) {
    return { status: true, description: true, assignee: true, dueAt: true, priority: true, title: true }
  }
  const led = departmentsLedBy(memberships, departments, task.workspaceId, sessionUserId ?? '')
  if (leadOwnsDepartment(task.departmentId, led)) {
    return { status: true, description: true, assignee: true, dueAt: true, priority: true, title: true }
  }
  if (task.assigneeUserId === sessionUserId) {
    return { status: true, description: true, assignee: false, dueAt: false, priority: false, title: false }
  }
  return { status: false, description: false, assignee: false, dueAt: false, priority: false, title: false }
}

/** Statuses allowed as follow-up choices when a member updates their own task. */
export function allowedStatusTransitions(current: TaskStatus): TaskStatus[] {
  // v1 keeps transitions open (any status) but excludes weird self-loops;
  // documented in docs/IMPLEMENTATION_NOTES.md.
  const all: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled']
  return all.filter((s) => s !== current)
}
