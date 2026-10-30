import { describe, expect, it } from 'vitest'
import { can, editableTaskFields, roleForUser, type DepartmentLike } from '../src/lib/permissions'
import type { Task, WorkspaceMember } from '../src/types/data'

const memberships: WorkspaceMember[] = [
  { workspaceId: 'ws1', userId: 'owner', role: 'owner', joinedAt: '2026-01-01' },
  { workspaceId: 'ws1', userId: 'admin', role: 'admin', joinedAt: '2026-01-01' },
  { workspaceId: 'ws1', userId: 'lead-teknologi', role: 'lead', joinedAt: '2026-01-01' },
  { workspaceId: 'ws1', userId: 'lead-desain', role: 'lead', joinedAt: '2026-01-01' },
  { workspaceId: 'ws1', userId: 'member', role: 'member', joinedAt: '2026-01-01' },
  { workspaceId: 'ws1', userId: 'viewer', role: 'viewer', joinedAt: '2026-01-01' },
  // Workspace B — for cross-workspace checks
  { workspaceId: 'ws2', userId: 'outsider', role: 'owner', joinedAt: '2026-01-01' },
]

const departments: DepartmentLike[] = [
  { id: 'd-teknologi', workspaceId: 'ws1', leadUserId: 'lead-teknologi' },
  { id: 'd-desain', workspaceId: 'ws1', leadUserId: 'lead-desain' },
]

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    workspaceId: 'ws1',
    programId: null,
    departmentId: 'd-teknologi',
    title: 'Tugas',
    description: null,
    status: 'todo',
    priority: 'normal',
    assigneeUserId: null,
    createdBy: 'owner',
    dueAt: null,
    blockedReason: null,
    decisionId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  }
}

const ctx = { workspaceId: 'ws1', departmentId: 'd-teknologi', departments }

describe('permission matrix (mirror of the RLS policy set)', () => {
  it('allows admin/owner to create anywhere; lead only in their department', () => {
    expect(can('owner', memberships, 'task:create', ctx).allowed).toBe(true)
    expect(can('admin', memberships, 'task:create', ctx).allowed).toBe(true)
    expect(can('lead-teknologi', memberships, 'task:create', ctx).allowed).toBe(true)
    expect(can('lead-desain', memberships, 'task:create', { ...ctx, departmentId: 'd-teknologi' }).allowed).toBe(false)
    expect(can('member', memberships, 'task:create', ctx).allowed).toBe(false)
    expect(can('viewer', memberships, 'task:create', ctx).allowed).toBe(false)
  })

  it('lets a member update only tasks assigned to them', () => {
    const own = task({ assigneeUserId: 'member' })
    const other = task({ assigneeUserId: 'lead-teknologi' })
    expect(can('member', memberships, 'task:update', { ...ctx, task: own }).allowed).toBe(true)
    expect(can('member', memberships, 'task:update', { ...ctx, task: other }).allowed).toBe(false)
    expect(can('viewer', memberships, 'task:update', { ...ctx, task: own }).allowed).toBe(false)
  })

  it('blocks non-members and unauthenticated users entirely', () => {
    expect(can(null, memberships, 'task:create', ctx).allowed).toBe(false)
    expect(can('outsider', memberships, 'task:create', ctx).reason).toBe('not_a_member')
    expect(can('outsider', memberships, 'task:update', { ...ctx, task: task() }).allowed).toBe(false)
  })

  it('restricts archiving to admin and above', () => {
    expect(can('lead-teknologi', memberships, 'program:archive', ctx).allowed).toBe(false)
    expect(can('admin', memberships, 'program:archive', ctx).allowed).toBe(true)
  })

  it('gates deletion to admin or the owning lead', () => {
    expect(can('lead-teknologi', memberships, 'task:delete', { ...ctx, task: task() }).allowed).toBe(true)
    expect(can('lead-desain', memberships, 'task:delete', { ...ctx, task: task() }).allowed).toBe(false)
    expect(can('member', memberships, 'task:delete', { ...ctx, task: task({ assigneeUserId: 'member' }) }).allowed).toBe(false)
  })
})

describe('editableTaskFields', () => {
  it('assigned members can change status/description but not assignment or schedule', () => {
    const fields = editableTaskFields('member', task({ assigneeUserId: 'member' }), 'member', memberships, departments)
    expect(fields.status).toBe(true)
    expect(fields.description).toBe(true)
    expect(fields.assignee).toBe(false)
    expect(fields.dueAt).toBe(false)
    expect(fields.title).toBe(false)
  })

  it('leads of the department can edit everything on their tasks', () => {
    const fields = editableTaskFields('lead', task(), 'lead-teknologi', memberships, departments)
    expect(fields.assignee).toBe(true)
    expect(fields.dueAt).toBe(true)
    expect(fields.title).toBe(true)
  })

  it('viewers can edit nothing', () => {
    const fields = editableTaskFields('viewer', task(), 'viewer', memberships, departments)
    expect(Object.values(fields).every((v) => v === false)).toBe(true)
  })
})

describe('roleForUser', () => {
  it('resolves per workspace and returns null for non-members', () => {
    expect(roleForUser(memberships, 'ws1', 'lead-teknologi')).toBe('lead')
    expect(roleForUser(memberships, 'ws2', 'lead-teknologi')).toBeNull()
  })
})
