import { beforeEach, describe, expect, it } from 'vitest'
import { LocalDataClient } from '../src/lib/data/LocalDataClient'
import { PermissionError, ValidationError } from '../src/types/data'
import { WORKSPACE_A, WORKSPACE_B } from '../src/lib/data/seed'

/**
 * The local adapter enforces the same rules production will enforce via RLS
 * (docs/SECURITY.md §11 release gate, adapted to the demo adapter):
 * authentication, workspace isolation, role checks, validation, and the
 * meeting→task flow.
 */

beforeEach(() => {
  localStorage.clear()
})

async function signedIn(userId: string): Promise<LocalDataClient> {
  const client = new LocalDataClient()
  await client.signInAs(userId)
  return client
}

describe('session', () => {
  it('starts signed out', async () => {
    const client = new LocalDataClient()
    expect((await client.getSession()).userId).toBeNull()
    await expect(client.listWorkspacesForSession()).rejects.toThrow(PermissionError)
  })

  it('persists a sign-in', async () => {
    const client = await signedIn('u-fajar')
    expect((await client.getSession()).userId).toBe('u-fajar')
    const workspaces = await client.listWorkspacesForSession()
    expect(workspaces.map((w) => w.id)).toEqual([WORKSPACE_A])
  })
})

describe('workspace isolation (cross-workspace IDOR)', () => {
  it('a member of workspace B cannot read workspace A', async () => {
    const client = await signedIn('u-hana') // owner of ws B only
    await expect(client.fetchWorkspace(WORKSPACE_A)).rejects.toThrow(PermissionError)
  })

  it('a member of workspace A cannot mutate a workspace B task by id', async () => {
    // Discover a workspace-B task id as its owner…
    const hana = await signedIn('u-hana')
    const snapshotB = await hana.fetchWorkspace(WORKSPACE_B)
    const taskB = snapshotB.tasks[0]!.id
    await hana.signOut()

    // …then attempt the mutation as a workspace-A lead.
    const fajar = await signedIn('u-fajar')
    await expect(fajar.updateTask(taskB, { status: 'done' })).rejects.toThrow(PermissionError)
  })
})

describe('role matrix through the adapter', () => {
  it('lead can update own-department task status', async () => {
    const client = await signedIn('u-fajar')
    const snapshot = await client.fetchWorkspace(WORKSPACE_A)
    const task = snapshot.tasks.find((t) => t.departmentId === 'd-teknologi' && t.status === 'todo')!
    const updated = await client.updateTask(task.id, { status: 'in_progress' })
    expect(updated.status).toBe('in_progress')
  })

  it('lead cannot update another department’s task', async () => {
    const client = await signedIn('u-fajar')
    const snapshot = await client.fetchWorkspace(WORKSPACE_A)
    const task = snapshot.tasks.find((t) => t.departmentId === 'd-desain')!
    await expect(client.updateTask(task.id, { status: 'done' })).rejects.toThrow(PermissionError)
  })

  it('member can update own task but not reassign it', async () => {
    const client = await signedIn('u-maya')
    const snapshot = await client.fetchWorkspace(WORKSPACE_A)
    const own = snapshot.tasks.find((t) => t.assigneeUserId === 'u-maya')!
    await expect(client.updateTask(own.id, { status: 'done' })).resolves.toMatchObject({ status: 'done' })
    await expect(client.updateTask(own.id, { assigneeUserId: 'u-rizky' })).rejects.toThrow(PermissionError)
  })

  it('viewer cannot update anything', async () => {
    const client = await signedIn('u-anton')
    const snapshot = await client.fetchWorkspace(WORKSPACE_A)
    const task = snapshot.tasks[0]!
    await expect(client.updateTask(task.id, { status: 'done' })).rejects.toThrow(PermissionError)
  })

  it('member cannot create programs or meetings', async () => {
    const client = await signedIn('u-andi')
    await expect(
      client.createProgram({ workspaceId: WORKSPACE_A, departmentId: 'd-teknologi', title: 'Program ilegal', objective: null, description: null, ownerUserId: null, startDate: null, dueDate: null }),
    ).rejects.toThrow(PermissionError)
    await expect(
      client.createMeeting({ workspaceId: WORKSPACE_A, departmentId: null, title: 'Rapat ilegal', startsAt: new Date().toISOString(), endsAt: null, meetingUrl: null, agenda: null, attendeeUserIds: [] }),
    ).rejects.toThrow(PermissionError)
  })
})

describe('validation through the adapter', () => {
  it('rejects short titles and non-https meeting URLs', async () => {
    const owner = await signedIn('u-ratna')
    await expect(
      owner.createTask({ workspaceId: WORKSPACE_A, programId: null, departmentId: 'd-teknologi', title: 'ab', description: null, priority: 'normal', assigneeUserId: null, dueAt: null }),
    ).rejects.toThrow(ValidationError)
    await expect(
      owner.createMeeting({ workspaceId: WORKSPACE_A, departmentId: null, title: 'Rapat valid', startsAt: new Date().toISOString(), endsAt: null, meetingUrl: 'javascript:alert(1)', agenda: null, attendeeUserIds: [] }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects meetings ending before they start', async () => {
    const client = await signedIn('u-ratna')
    const start = new Date('2026-11-02T10:00:00Z').toISOString()
    const end = new Date('2026-11-02T09:00:00Z').toISOString()
    await expect(
      client.createMeeting({ workspaceId: WORKSPACE_A, departmentId: null, title: 'Rapat terbalik', startsAt: start, endsAt: end, meetingUrl: null, agenda: null, attendeeUserIds: [] }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects assigning tasks to non-members', async () => {
    const client = await signedIn('u-ratna')
    await expect(
      client.createTask({ workspaceId: WORKSPACE_A, programId: null, departmentId: 'd-teknologi', title: 'Tugas lintas workspace', description: null, priority: 'normal', assigneeUserId: 'u-hana', dueAt: null }),
    ).rejects.toThrow(ValidationError)
  })
})

describe('meeting decision → task (Flow E)', () => {
  it('creates exactly one linked task per decision and refuses duplicates', async () => {
    const client = await signedIn('u-dewi')
    const snapshot = await client.fetchWorkspace(WORKSPACE_A)
    const pendingDecision = snapshot.decisions.find((d) => d.id === 'dc-anggaran')!

    const created = await client.createTaskFromDecision(pendingDecision.id, {
      title: 'Revisi anggaran konsumsi',
      assigneeUserId: 'u-bagus',
      dueAt: null,
      departmentId: 'd-acara',
      programId: 'p-event',
      priority: 'normal',
    })
    expect(created.decisionId).toBe('dc-anggaran')

    await expect(
      client.createTaskFromDecision(pendingDecision.id, {
        title: 'Duplikat',
        assigneeUserId: null,
        dueAt: null,
        departmentId: null,
        programId: null,
        priority: 'normal',
      }),
    ).rejects.toThrow(/sudah memiliki tugas/)
  })
})

describe('workspaces, departments, recurrence', () => {
  it('creates a private workspace with the creator as owner', async () => {
    const client = await signedIn('u-andi')
    const ws = await client.createWorkspace({ name: 'Divisi Riset Baru', purpose: 'Uji coba', timezone: 'Asia/Jakarta' })
    expect(ws.visibility).toBe('private')
    const snap = await client.fetchWorkspace(ws.id)
    expect(snap.workspace.name).toBe('Divisi Riset Baru')
    expect(snap.memberships).toHaveLength(1)
    expect(snap.memberships[0]).toMatchObject({ userId: 'u-andi', role: 'owner' })
  })

  it('rejects invalid workspace names', async () => {
    const client = await signedIn('u-andi')
    await expect(client.createWorkspace({ name: 'ab', purpose: null, timezone: 'Asia/Jakarta' })).rejects.toThrow(ValidationError)
  })

  it('admin creates a department; duplicate names rejected; members forbidden', async () => {
    const owner = await signedIn('u-ratna')
    const dept = await owner.createDepartment({ workspaceId: WORKSPACE_A, name: 'PSDM', description: 'Pengembangan SDM' })
    expect(dept.name).toBe('PSDM')
    await expect(owner.createDepartment({ workspaceId: WORKSPACE_A, name: 'psdm', description: null })).rejects.toThrow(ValidationError)
    await expect(
      (async () => {
        localStorage.clear()
        const member = await signedIn('u-andi')
        return member.createDepartment({ workspaceId: WORKSPACE_A, name: 'Ilegal', description: null })
      })(),
    ).rejects.toThrow(PermissionError)
  })

  it('completing a weekly recurring task spawns the next occurrence once', async () => {
    const client = await signedIn('u-ratna')
    const snapshot = await client.fetchWorkspace(WORKSPACE_A)
    const weekly = snapshot.tasks.find((t) => t.recurrence === 'weekly' && t.status === 'todo')!
    const dueBefore = new Date(weekly.dueAt!)

    const done = await client.updateTask(weekly.id, { status: 'done' })
    expect(done.status).toBe('done')

    const after = await client.fetchWorkspace(WORKSPACE_A)
    const spawned = after.tasks.filter((t) => t.title === weekly.title && t.status === 'todo')
    expect(spawned).toHaveLength(1)
    const expectedDue = new Date(dueBefore)
    expectedDue.setDate(expectedDue.getDate() + 7)
    expect(new Date(spawned[0]!.dueAt!).toDateString()).toBe(expectedDue.toDateString())

    // completing the spawned one spawns again; the done original does not
    await client.updateTask(spawned[0]!.id, { status: 'done' })
    const final = await client.fetchWorkspace(WORKSPACE_A)
    expect(final.tasks.filter((t) => t.title === weekly.title && t.status === 'todo')).toHaveLength(1)
    expect(final.tasks.filter((t) => t.title === weekly.title && t.status === 'done')).toHaveLength(2)
  })

  it('non-recurring tasks do not spawn', async () => {
    const client = await signedIn('u-ratna')
    const snapshot = await client.fetchWorkspace(WORKSPACE_A)
    const plain = snapshot.tasks.find((t) => !t.recurrence && t.status === 'todo')!
    await client.updateTask(plain.id, { status: 'done' })
    const after = await client.fetchWorkspace(WORKSPACE_A)
    expect(after.tasks.filter((t) => t.title === plain.title)).toHaveLength(1)
  })
})

describe('activity log', () => {
  it('records task changes without private content', async () => {
    const client = await signedIn('u-fajar')
    const snapshot = await client.fetchWorkspace(WORKSPACE_A)
    const task = snapshot.tasks.find((t) => t.departmentId === 'd-teknologi' && t.status === 'todo')!
    await client.updateTask(task.id, { status: 'done' })
    const after = await client.fetchWorkspace(WORKSPACE_A)
    const events = after.activity.filter((a) => a.entityId === task.id)
    expect(events.some((e) => e.action === 'task.status_changed')).toBe(true)
    // Metadata must not contain task descriptions (allowlisted fields only).
    for (const event of events) {
      expect(Object.keys(event.metadata).every((k) => ['taskTitle', 'changes', 'from', 'to'].includes(k))).toBe(true)
    }
  })
})
