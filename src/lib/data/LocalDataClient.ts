import type {
  Decision,
  Department,
  Workspace,
  DepartmentCreateInput,
  TaskComment,
  WorkspaceCreateInput,
  Meeting,
  Program,
  ProgramCreateInput,
  Session,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  MeetingCreateInput,
  MemberAddInput,
  MemberUpdateInput,
  WorkspaceMember,
  WorkspaceSnapshot,
  ActivityEvent,
} from '../../types/data'
import { PermissionError, ValidationError } from '../../types/data'
import type { DataClient } from './DataClient'
import { buildSeedDatabase, type SeedDatabase } from './seed'
import { atLeast, can, roleForUser } from '../permissions'
import { isValidSeatId } from '../../features/pixel-office/seatCatalog'
import {
  LIMITS,
  validateDateRange,
  validateDateString,
  validateHttpsUrl,
  validateOptionalText,
  validateTitle,
} from '../validation'

/**
 * Local persistence adapter for development/demo.
 *
 * This adapter KEEPS THE SAME RULES the production database will enforce
 * (docs/SECURITY.md): every mutation re-checks workspace membership and the
 * role matrix, re-validates all input, and appends activity events. It is a
 * stand-in for Supabase Auth + Postgres RLS, NOT a security boundary — it runs
 * entirely in the browser. See docs/IMPLEMENTATION_NOTES.md.
 */

const DB_KEY = 'pixeloffice.db.v2' // v2: org-specific rooms/departments (BPH, Keuangan, Humas)
const SESSION_KEY = 'pixeloffice.session.v1'

interface StoredDatabase extends SeedDatabase {
  seededAt: string
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function loadDb(): StoredDatabase {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredDatabase
      if (parsed && parsed.workspaces && parsed.tasks) {
        // Forward-migrate databases stored before comments/recurrence existed.
        if (!Array.isArray(parsed.comments)) parsed.comments = []
        for (const task of parsed.tasks) task.recurrence ??= null
        return parsed
      }
    } catch {
      // fall through to reseed
    }
  }
  const seeded: StoredDatabase = { ...buildSeedDatabase(new Date()), seededAt: new Date().toISOString() }
  localStorage.setItem(DB_KEY, JSON.stringify(seeded))
  return seeded
}

function saveDb(db: StoredDatabase): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export class LocalDataClient implements DataClient {
  private db: StoredDatabase

  constructor() {
    this.db = loadDb()
  }

  // ---- helpers -------------------------------------------------------------

  private requireSession(): string {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) throw new PermissionError('Belum masuk.', 'not_authenticated')
    const session = JSON.parse(raw) as Session
    if (!session.userId) throw new PermissionError('Belum masuk.', 'not_authenticated')
    return session.userId
  }

  private requireMembership(workspaceId: string): string {
    const userId = this.requireSession()
    const membership = this.db.memberships.find((m) => m.workspaceId === workspaceId && m.userId === userId)
    if (!membership) {
      // Deliberately vague: do not reveal workspace existence to non-members.
      throw new PermissionError('Anda tidak memiliki akses ke workspace ini.', 'not_a_member')
    }
    return userId
  }

  private requireDepartment(workspaceId: string, departmentId: string | null): void {
    if (departmentId === null) return
    const dept = this.db.departments.find((d) => d.id === departmentId)
    if (!dept || dept.workspaceId !== workspaceId) {
      throw new ValidationError('Departemen tidak ditemukan di workspace ini.', 'departmentId')
    }
  }

  private requireProgram(workspaceId: string, programId: string | null): Program | null {
    if (programId === null) return null
    const program = this.db.programs.find((p) => p.id === programId)
    if (!program || program.workspaceId !== workspaceId) {
      throw new ValidationError('Program kerja tidak ditemukan di workspace ini.', 'programId')
    }
    return program
  }

  private logActivity(event: Omit<ActivityEvent, 'id' | 'createdAt' | 'workspaceId'> & { workspaceId: string }): void {
    this.db.activity.push({
      id: uuid(),
      createdAt: new Date().toISOString(),
      ...event,
    })
  }

  // ---- session -------------------------------------------------------------

  async getSession(): Promise<Session> {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : { userId: null }
  }

  async signInAs(userId: string): Promise<Session> {
    const profile = this.db.profiles.find((p) => p.id === userId)
    if (!profile) throw new ValidationError('Akun demo tidak ditemukan.', 'userId')
    const session: Session = { userId }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
  }

  // ---- reads ---------------------------------------------------------------

  async listWorkspacesForSession(): Promise<{ id: string; name: string }[]> {
    const userId = this.requireSession()
    const ids = new Set(this.db.memberships.filter((m) => m.userId === userId).map((m) => m.workspaceId))
    return this.db.workspaces.filter((w) => ids.has(w.id)).map((w) => ({ id: w.id, name: w.name }))
  }

  async fetchWorkspace(workspaceId: string): Promise<WorkspaceSnapshot> {
    const userId = this.requireSession()
    const workspace = this.db.workspaces.find((w) => w.id === workspaceId)
    if (!workspace) throw new PermissionError('Workspace tidak ditemukan.', 'not_a_member')
    const membership = this.db.memberships.find((m) => m.workspaceId === workspaceId && m.userId === userId)
    if (!membership) throw new PermissionError('Anda tidak memiliki akses ke workspace ini.', 'not_a_member')

    const profiles: WorkspaceSnapshot['profiles'] = {}
    for (const m of this.db.memberships.filter((x) => x.workspaceId === workspaceId)) {
      const profile = this.db.profiles.find((p) => p.id === m.userId)
      if (profile) profiles[profile.id] = { id: profile.id, displayName: profile.displayName }
    }
    return {
      workspace,
      profiles,
      memberships: this.db.memberships.filter((m) => m.workspaceId === workspaceId),
      departments: this.db.departments.filter((d) => d.workspaceId === workspaceId),
      programs: this.db.programs.filter((p) => p.workspaceId === workspaceId),
      tasks: this.db.tasks.filter((t) => t.workspaceId === workspaceId),
      meetings: this.db.meetings.filter((m) => m.workspaceId === workspaceId),
      attendees: this.db.attendees.filter((a) => this.db.meetings.some((m) => m.id === a.meetingId && m.workspaceId === workspaceId)),
      decisions: this.db.decisions.filter((d) => d.workspaceId === workspaceId),
      activity: this.db.activity.filter((a) => a.workspaceId === workspaceId),
      comments: this.db.comments.filter((c) => c.workspaceId === workspaceId),
      fetchedAt: new Date().toISOString(),
    }
  }


  // ---- members -------------------------------------------------------------

  private requireMemberManager(workspaceId: string): string {
    const userId = this.requireMembership(workspaceId)
    const role = roleForUser(this.db.memberships, workspaceId, userId)
    if (!role || !atLeast(role, 'admin')) {
      throw new PermissionError('Hanya pemilik atau admin yang dapat mengelola anggota.', 'insufficient_role')
    }
    return userId
  }

  /** A seat may be held by one member at a time within a workspace. */
  private requireSeatFree(workspaceId: string, seatId: string | null, exceptUserId: string | null): void {
    if (seatId === null) return
    if (!isValidSeatId(seatId)) throw new ValidationError('Kursi tidak dikenal.', 'seatId')
    const taken = this.db.memberships.find((m) => m.workspaceId === workspaceId && m.seatId === seatId && m.userId !== exceptUserId)
    if (taken) throw new ValidationError('Kursi itu sudah dipakai anggota lain.', 'seatId')
  }

  async addMember(input: MemberAddInput): Promise<WorkspaceMember> {
    const actorId = this.requireMemberManager(input.workspaceId)
    const name = input.displayName.trim().replace(/\s+/g, ' ')
    if (name.length < 2) throw new ValidationError('Nama minimal 2 karakter.', 'displayName')
    if (name.length > LIMITS.nameMax) throw new ValidationError(`Nama maksimal ${LIMITS.nameMax} karakter.`, 'displayName')
    if ((input.role as string) === 'owner') throw new ValidationError('Peran pemilik tidak dapat diberikan.', 'role')
    this.requireDepartment(input.workspaceId, input.departmentId)
    this.requireSeatFree(input.workspaceId, input.seatId, null)

    const dup = this.db.memberships
      .filter((m) => m.workspaceId === input.workspaceId)
      .some((m) => this.db.profiles.find((p) => p.id === m.userId)?.displayName.toLowerCase() === name.toLowerCase())
    if (dup) throw new ValidationError('Sudah ada anggota dengan nama itu.', 'displayName')

    const userId = `u-${uuid()}`
    const now = new Date().toISOString()
    this.db.profiles.push({ id: userId, displayName: name })
    const member: WorkspaceMember = {
      workspaceId: input.workspaceId,
      userId,
      role: input.role,
      joinedAt: now,
      departmentId: input.departmentId,
      seatId: input.seatId,
    }
    this.db.memberships.push(member)
    this.claimLeadIfEmpty(input.workspaceId, userId, input.role, input.departmentId)
    this.logActivity({
      workspaceId: input.workspaceId,
      actorUserId: actorId,
      entityType: 'member',
      entityId: userId,
      action: 'member.added',
      metadata: { memberName: name },
    })
    saveDb(this.db)
    return member
  }

  async updateMember(workspaceId: string, userId: string, patch: MemberUpdateInput): Promise<WorkspaceMember> {
    const actorId = this.requireMemberManager(workspaceId)
    const member = this.db.memberships.find((m) => m.workspaceId === workspaceId && m.userId === userId)
    if (!member) throw new ValidationError('Anggota tidak ditemukan di workspace ini.', 'userId')
    if (patch.role !== undefined) {
      if ((patch.role as string) === 'owner') throw new ValidationError('Peran pemilik tidak dapat diberikan.', 'role')
      if (member.role === 'owner') throw new ValidationError('Peran pemilik tidak dapat diubah.', 'role')
      if (userId === actorId && patch.role !== member.role) throw new ValidationError('Anda tidak dapat mengubah peran Anda sendiri.', 'role')
    }
    if (patch.departmentId !== undefined) this.requireDepartment(workspaceId, patch.departmentId)
    if (patch.seatId !== undefined) this.requireSeatFree(workspaceId, patch.seatId, userId)

    if (patch.role !== undefined) member.role = patch.role
    if (patch.departmentId !== undefined) member.departmentId = patch.departmentId
    if (patch.seatId !== undefined) member.seatId = patch.seatId
    this.claimLeadIfEmpty(workspaceId, userId, member.role, member.departmentId ?? null)
    this.logActivity({
      workspaceId,
      actorUserId: actorId,
      entityType: 'member',
      entityId: userId,
      action: 'member.updated',
      metadata: { memberName: this.db.profiles.find((p) => p.id === userId)?.displayName ?? '' },
    })
    saveDb(this.db)
    return member
  }

  /** A new "lead" fills an empty lead slot of their division (never replaces an existing lead). */
  private claimLeadIfEmpty(workspaceId: string, userId: string, role: string, departmentId: string | null): void {
    if (role !== 'lead' || !departmentId) return
    const dept = this.db.departments.find((d) => d.id === departmentId && d.workspaceId === workspaceId)
    if (dept && !dept.leadUserId) dept.leadUserId = userId
  }

  // ---- tasks ---------------------------------------------------------------

  async createTask(input: TaskCreateInput): Promise<Task> {
    const userId = this.requireSession()
    const workspace: Workspace | undefined = this.db.workspaces.find((w) => w.id === input.workspaceId)
    if (!workspace) throw new PermissionError('Workspace tidak ditemukan.', 'cross_workspace')
    this.requireMembership(input.workspaceId)
    this.requireDepartment(input.workspaceId, input.departmentId)
    this.requireProgram(input.workspaceId, input.programId)

    const decision = can(userId, this.db.memberships, 'task:create', {
      workspaceId: input.workspaceId,
      departmentId: input.departmentId,
      departments: this.db.departments,
    })
    if (!decision.allowed) {
      throw new PermissionError('Anda tidak memiliki izin membuat tugas.', decision.reason === 'not_a_member' ? 'not_a_member' : 'insufficient_role')
    }

    if (input.assigneeUserId) {
      const assigneeMember = this.db.memberships.find((m) => m.workspaceId === input.workspaceId && m.userId === input.assigneeUserId)
      if (!assigneeMember) throw new ValidationError('Penanggung jawab harus anggota workspace ini.', 'assigneeUserId')
    }

    const now = new Date().toISOString()
    const task: Task = {
      id: uuid(),
      workspaceId: input.workspaceId,
      programId: input.programId,
      departmentId: input.departmentId,
      title: validateTitle(input.title),
      description: validateOptionalText(input.description, LIMITS.descriptionMax, 'description', 'Deskripsi'),
      status: 'todo',
      priority: input.priority,
      recurrence: input.recurrence ?? null,
      assigneeUserId: input.assigneeUserId,
      createdBy: userId,
      dueAt: validateDateString(input.dueAt, 'dueAt', 'Tenggat'),
      blockedReason: null,
      decisionId: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    }
    this.db.tasks.push(task)
    this.logActivity({
      workspaceId: input.workspaceId,
      actorUserId: userId,
      entityType: 'task',
      entityId: task.id,
      action: 'task.created',
      metadata: { taskTitle: task.title },
    })
    saveDb(this.db)
    return task
  }

  async updateTask(taskId: string, patch: TaskUpdateInput): Promise<Task> {
    const userId = this.requireSession()
    const task = this.db.tasks.find((x) => x.id === taskId)
    if (!task) throw new PermissionError('Tugas tidak ditemukan.', 'not_a_member')

    // Cross-workspace guard first: the caller must be a member of the task's
    // own workspace, whatever IDs the request carries.
    this.requireMembership(task.workspaceId)

    const role = roleForUser(this.db.memberships, task.workspaceId, userId)
    const editable = can(userId, this.db.memberships, 'task:update', {
      workspaceId: task.workspaceId,
      departmentId: task.departmentId,
      task,
      departments: this.db.departments,
    })
    if (!editable.allowed) {
      throw new PermissionError('Anda tidak memiliki izin memperbarui tugas ini.', 'insufficient_role')
    }

    const now = new Date().toISOString()
    const changes: string[] = []
    const previousStatus = task.status

    if (patch.status !== undefined && patch.status !== task.status) {
      task.status = patch.status
      task.completedAt = patch.status === 'done' ? now : null
      changes.push(`status: ${patch.status}`)
      // Recurring task completed: spawn the next occurrence as fresh `todo`
      // (PRD P1). Only on the todo -> done transition, never repeatedly.
      if (patch.status === 'done' && previousStatus !== 'done' && task.recurrence) {
        const base = task.dueAt ? new Date(task.dueAt) : new Date(now)
        const next = new Date(base)
        if (task.recurrence === 'weekly') next.setDate(next.getDate() + 7)
        else next.setMonth(next.getMonth() + 1)
        const spawned: Task = {
          ...task,
          id: uuid(),
          status: 'todo',
          completedAt: null,
          blockedReason: null,
          dueAt: next.toISOString(),
          createdAt: now,
          updatedAt: now,
        }
        this.db.tasks.push(spawned)
        this.logActivity({
          workspaceId: task.workspaceId,
          actorUserId: userId,
          entityType: 'task',
          entityId: spawned.id,
          action: 'task.recurring_spawned',
          metadata: { taskTitle: spawned.title, recurrence: task.recurrence },
        })
        changes.push(`tugas berulang berikutnya dibuat`)
      }
    }
    if (patch.blockedReason !== undefined) {
      task.blockedReason = validateOptionalText(patch.blockedReason, LIMITS.descriptionMax, 'blockedReason', 'Alasan terhambat')
    }
    if (patch.description !== undefined) {
      if (role !== null && role !== 'member') {
        task.description = validateOptionalText(patch.description, LIMITS.descriptionMax, 'description', 'Deskripsi')
      } else if (task.assigneeUserId === userId) {
        task.description = validateOptionalText(patch.description, LIMITS.descriptionMax, 'description', 'Deskripsi')
      }
    }
    if (patch.title !== undefined) {
      if (role !== null && role !== 'member') {
        task.title = validateTitle(patch.title)
        changes.push('judul')
      } else {
        throw new PermissionError('Anggota tidak dapat mengubah judul tugas.', 'insufficient_role')
      }
    }
    if (patch.assigneeUserId !== undefined) {
      if (role !== null && role !== 'member') {
        if (patch.assigneeUserId) {
          const member = this.db.memberships.find((m) => m.workspaceId === task.workspaceId && m.userId === patch.assigneeUserId)
          if (!member) throw new ValidationError('Penanggung jawab harus anggota workspace ini.', 'assigneeUserId')
        }
        task.assigneeUserId = patch.assigneeUserId
        changes.push('penanggung jawab')
      } else {
        throw new PermissionError('Anggota tidak dapat mengubah penanggung jawab.', 'insufficient_role')
      }
    }
    if (patch.dueAt !== undefined) {
      if (role !== null && role !== 'member') {
        task.dueAt = validateDateString(patch.dueAt, 'dueAt', 'Tenggat')
        changes.push('tenggat')
      } else {
        throw new PermissionError('Anggota tidak dapat mengubah tenggat.', 'insufficient_role')
      }
    }
    if (patch.priority !== undefined) {
      if (role !== null && role !== 'member') {
        task.priority = patch.priority
        changes.push('prioritas')
      } else {
        throw new PermissionError('Anggota tidak dapat mengubah prioritas.', 'insufficient_role')
      }
    }

    task.updatedAt = now
    this.logActivity({
      workspaceId: task.workspaceId,
      actorUserId: userId,
      entityType: 'task',
      entityId: task.id,
      action: patch.status !== undefined && patch.status !== previousStatus ? 'task.status_changed' : 'task.updated',
      metadata: changes.length > 0 ? { changes: changes.join(', '), taskTitle: task.title } : { taskTitle: task.title },
    })
    saveDb(this.db)
    return { ...task }
  }

  async deleteTask(taskId: string): Promise<void> {
    const userId = this.requireSession()
    const task = this.db.tasks.find((x) => x.id === taskId)
    if (!task) return
    this.requireMembership(task.workspaceId)
    const allowed = can(userId, this.db.memberships, 'task:delete', {
      workspaceId: task.workspaceId,
      departmentId: task.departmentId,
      task,
      departments: this.db.departments,
    })
    if (!allowed.allowed) throw new PermissionError('Anda tidak memiliki izin menghapus tugas ini.', 'insufficient_role')
    this.db.tasks = this.db.tasks.filter((t) => t.id !== taskId)
    this.logActivity({
      workspaceId: task.workspaceId,
      actorUserId: userId,
      entityType: 'task',
      entityId: taskId,
      action: 'task.deleted',
      metadata: { taskTitle: task.title },
    })
    saveDb(this.db)
  }

  // ---- programs ------------------------------------------------------------

  async createProgram(input: ProgramCreateInput): Promise<Program> {
    const userId = this.requireSession()
    const workspace = this.db.workspaces.find((w) => w.id === input.workspaceId)
    if (!workspace) throw new PermissionError('Workspace tidak ditemukan.', 'cross_workspace')
    this.requireMembership(input.workspaceId)
    this.requireDepartment(input.workspaceId, input.departmentId)

    const allowed = can(userId, this.db.memberships, 'program:create', {
      workspaceId: input.workspaceId,
      departmentId: input.departmentId,
      departments: this.db.departments,
    })
    if (!allowed.allowed) throw new PermissionError('Anda tidak memiliki izin membuat program kerja.', 'insufficient_role')

    if (input.ownerUserId) {
      const owner = this.db.memberships.find((m) => m.workspaceId === input.workspaceId && m.userId === input.ownerUserId)
      if (!owner) throw new ValidationError('Penanggung jawab harus anggota workspace ini.', 'ownerUserId')
    }

    const now = new Date().toISOString()
    const startDate = validateDateString(input.startDate, 'startDate', 'Tanggal mulai')
    const dueDate = validateDateString(input.dueDate, 'dueDate', 'Tenggat')
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      throw new ValidationError('Tenggat harus setelah tanggal mulai.', 'dueDate')
    }
    const program: Program = {
      id: uuid(),
      workspaceId: input.workspaceId,
      departmentId: input.departmentId,
      title: validateTitle(input.title),
      objective: validateOptionalText(input.objective, LIMITS.summaryMax, 'objective', 'Tujuan'),
      description: validateOptionalText(input.description, LIMITS.descriptionMax, 'description', 'Deskripsi'),
      status: 'planned',
      ownerUserId: input.ownerUserId,
      startDate: startDate ? startDate.slice(0, 10) : null,
      dueDate: dueDate ? dueDate.slice(0, 10) : null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.programs.push(program)
    this.logActivity({
      workspaceId: input.workspaceId,
      actorUserId: userId,
      entityType: 'program',
      entityId: program.id,
      action: 'program.created',
      metadata: { programTitle: program.title },
    })
    saveDb(this.db)
    return program
  }

  async updateProgramStatus(programId: string, status: Program['status']): Promise<Program> {
    const userId = this.requireSession()
    const program = this.db.programs.find((p) => p.id === programId)
    if (!program) throw new PermissionError('Program tidak ditemukan.', 'not_a_member')
    this.requireMembership(program.workspaceId)
    const allowed = can(userId, this.db.memberships, 'program:update', {
      workspaceId: program.workspaceId,
      departmentId: program.departmentId,
      departments: this.db.departments,
    })
    if (!allowed.allowed) throw new PermissionError('Anda tidak memiliki izin mengubah program ini.', 'insufficient_role')
    program.status = status
    program.updatedAt = new Date().toISOString()
    this.logActivity({
      workspaceId: program.workspaceId,
      actorUserId: userId,
      entityType: 'program',
      entityId: program.id,
      action: `program.${status}`,
      metadata: { programTitle: program.title },
    })
    saveDb(this.db)
    return { ...program }
  }

  // ---- meetings ------------------------------------------------------------

  async createMeeting(input: MeetingCreateInput): Promise<Meeting> {
    const userId = this.requireSession()
    const workspace = this.db.workspaces.find((w) => w.id === input.workspaceId)
    if (!workspace) throw new PermissionError('Workspace tidak ditemukan.', 'cross_workspace')
    this.requireMembership(input.workspaceId)
    this.requireDepartment(input.workspaceId, input.departmentId)
    const allowed = can(userId, this.db.memberships, 'meeting:create', {
      workspaceId: input.workspaceId,
      departmentId: input.departmentId,
      departments: this.db.departments,
    })
    if (!allowed.allowed) throw new PermissionError('Anda tidak memiliki izin membuat rapat.', 'insufficient_role')

    const { startsAt, endsAt } = validateDateRange(input.startsAt, input.endsAt)
    const url = validateHttpsUrl(input.meetingUrl)
    for (const attendeeId of input.attendeeUserIds) {
      const member = this.db.memberships.find((m) => m.workspaceId === input.workspaceId && m.userId === attendeeId)
      if (!member) throw new ValidationError('Peserta rapat harus anggota workspace ini.', 'attendeeUserIds')
    }

    const now = new Date().toISOString()
    const meeting: Meeting = {
      id: uuid(),
      workspaceId: input.workspaceId,
      departmentId: input.departmentId,
      title: validateTitle(input.title),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt ? endsAt.toISOString() : null,
      meetingUrl: url,
      agenda: validateOptionalText(input.agenda, LIMITS.agendaMax, 'agenda', 'Agenda'),
      notes: null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }
    this.db.meetings.push(meeting)
    for (const attendeeId of new Set(input.attendeeUserIds)) {
      this.db.attendees.push({ meetingId: meeting.id, userId: attendeeId, attendanceStatus: 'invited' })
    }
    this.logActivity({
      workspaceId: input.workspaceId,
      actorUserId: userId,
      entityType: 'meeting',
      entityId: meeting.id,
      action: 'meeting.created',
      metadata: { meetingTitle: meeting.title },
    })
    saveDb(this.db)
    return { ...meeting }
  }

  async updateMeetingNotes(meetingId: string, notes: string | null, agenda?: string | null): Promise<Meeting> {
    const userId = this.requireSession()
    const meeting = this.db.meetings.find((m) => m.id === meetingId)
    if (!meeting) throw new PermissionError('Rapat tidak ditemukan.', 'not_a_member')
    this.requireMembership(meeting.workspaceId)
    const allowed = can(userId, this.db.memberships, 'meeting:update', {
      workspaceId: meeting.workspaceId,
      departmentId: meeting.departmentId,
      departments: this.db.departments,
    })
    if (!allowed.allowed) throw new PermissionError('Anda tidak memiliki izin mengubah catatan rapat.', 'insufficient_role')
    meeting.notes = validateOptionalText(notes, LIMITS.notesMax, 'notes', 'Catatan')
    if (agenda !== undefined) {
      meeting.agenda = validateOptionalText(agenda, LIMITS.agendaMax, 'agenda', 'Agenda')
    }
    meeting.updatedAt = new Date().toISOString()
    saveDb(this.db)
    return { ...meeting }
  }

  async addDecision(meetingId: string, summary: string): Promise<void> {
    const userId = this.requireSession()
    const meeting = this.db.meetings.find((m) => m.id === meetingId)
    if (!meeting) throw new PermissionError('Rapat tidak ditemukan.', 'not_a_member')
    this.requireMembership(meeting.workspaceId)
    const allowed = can(userId, this.db.memberships, 'decision:create', {
      workspaceId: meeting.workspaceId,
      departmentId: meeting.departmentId,
      departments: this.db.departments,
    })
    if (!allowed.allowed) throw new PermissionError('Anda tidak memiliki izin menambah keputusan.', 'insufficient_role')
    const decision: Decision = {
      id: uuid(),
      meetingId: meeting.id,
      workspaceId: meeting.workspaceId,
      summary: validateOptionalText(summary, LIMITS.summaryMax, 'summary', 'Ringkasan keputusan') ?? '',
      createdBy: userId,
      createdAt: new Date().toISOString(),
    }
    if (decision.summary === '') throw new ValidationError('Ringkasan keputusan wajib diisi.', 'summary')
    this.db.decisions.push(decision)
    this.logActivity({
      workspaceId: meeting.workspaceId,
      actorUserId: userId,
      entityType: 'decision',
      entityId: decision.id,
      action: 'decision.created',
      metadata: { meetingTitle: meeting.title },
    })
    saveDb(this.db)
  }

  async createTaskFromDecision(
    decisionId: string,
    input: { title: string; assigneeUserId: string | null; dueAt: string | null; departmentId: string | null; programId: string | null; priority: Task['priority'] },
  ): Promise<Task> {
    const userId = this.requireSession()
    const decision = this.db.decisions.find((d) => d.id === decisionId)
    if (!decision) throw new PermissionError('Keputusan tidak ditemukan.', 'not_a_member')
    this.requireMembership(decision.workspaceId)

    // Idempotent: a decision becomes at most one task (PRD acceptance:
    // "without duplicating the decision").
    const existing = this.db.tasks.find((t) => t.decisionId === decisionId)
    if (existing) {
      throw new ValidationError('Keputusan ini sudah memiliki tugas tindak lanjut.', 'decisionId')
    }

    const task = await this.createTask({
      workspaceId: decision.workspaceId,
      programId: input.programId,
      departmentId: input.departmentId,
      title: input.title,
      description: `Tindak lanjut keputusan rapat: ${decision.summary}`,
      priority: input.priority,
      assigneeUserId: input.assigneeUserId,
      dueAt: input.dueAt,
    })
    task.decisionId = decisionId
    saveDb(this.db)
    this.logActivity({
      workspaceId: decision.workspaceId,
      actorUserId: userId,
      entityType: 'decision',
      entityId: decisionId,
      action: 'decision.task_created',
      metadata: { taskTitle: task.title },
    })
    saveDb(this.db)
    return task
  }

  async addTaskComment(taskId: string, body: string): Promise<void> {
    const userId = this.requireSession()
    const task = this.db.tasks.find((t) => t.id === taskId)
    if (!task) throw new PermissionError('Tugas tidak ditemukan.', 'not_a_member')
    this.requireMembership(task.workspaceId)
    // Any member except viewers may join the discussion (docs/PRD.md §5).
    const role = roleForUser(this.db.memberships, task.workspaceId, userId)
    if (role === null) throw new PermissionError('Anda bukan anggota workspace ini.', 'not_a_member')
    if (role === 'viewer') throw new PermissionError('Pengamat hanya dapat melihat.', 'insufficient_role')

    const comment: TaskComment = {
      id: uuid(),
      workspaceId: task.workspaceId,
      taskId: task.id,
      authorUserId: userId,
      body: validateOptionalText(body, LIMITS.descriptionMax, 'body', 'Komentar') ?? '',
      createdAt: new Date().toISOString(),
    }
    if (comment.body === '') throw new ValidationError('Komentar wajib diisi.', 'body')
    this.db.comments.push(comment)
    this.logActivity({
      workspaceId: task.workspaceId,
      actorUserId: userId,
      entityType: 'task',
      entityId: task.id,
      action: 'task.commented',
      metadata: { taskTitle: task.title },
    })
    saveDb(this.db)
  }

  // ---- workspaces & departments -------------------------------------------

  async createWorkspace(input: WorkspaceCreateInput): Promise<Workspace> {
    const userId = this.requireSession()
    const name = validateOptionalText(input.name, LIMITS.nameMax, 'name', 'Nama workspace') ?? ''
    if (name.length < 3) throw new ValidationError('Nama workspace minimal 3 karakter.', 'name')
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'
    let slug = slugBase
    let n = 2
    while (this.db.workspaces.some((w) => w.slug === slug)) slug = `${slugBase}-${n++}`
    const now = new Date().toISOString()
    const workspace: Workspace = {
      id: uuid(),
      name,
      slug,
      timezone: input.timezone || 'Asia/Jakarta',
      visibility: 'private',
      createdAt: now,
    }
    this.db.workspaces.push(workspace)
    this.db.profiles.push({ id: userId, displayName: this.db.profiles.find((p) => p.id === userId)?.displayName ?? 'Saya' })
    this.db.memberships.push({ workspaceId: workspace.id, userId, role: 'owner', joinedAt: now })
    saveDb(this.db)
    return workspace
  }

  async createDepartment(input: DepartmentCreateInput): Promise<Department> {
    const actorId = this.requireMemberManager(input.workspaceId)
    const name = validateOptionalText(input.name, LIMITS.nameMax, 'name', 'Nama departemen') ?? ''
    if (name.length < 2) throw new ValidationError('Nama departemen minimal 2 karakter.', 'name')
    const dup = this.db.departments.some((d) => d.workspaceId === input.workspaceId && d.name.toLowerCase() === name.toLowerCase())
    if (dup) throw new ValidationError('Sudah ada departemen dengan nama itu.', 'name')
    const department: Department = {
      id: uuid(),
      workspaceId: input.workspaceId,
      name,
      description: validateOptionalText(input.description, LIMITS.summaryMax, 'description', 'Deskripsi'),
      leadUserId: null,
      createdAt: new Date().toISOString(),
    }
    this.db.departments.push(department)
    this.logActivity({
      workspaceId: input.workspaceId,
      actorUserId: actorId,
      entityType: 'department',
      entityId: department.id,
      action: 'department.created',
      metadata: { departmentName: department.name },
    })
    saveDb(this.db)
    return department
  }

  // ---- demo maintenance ----------------------------------------------------

  async resetDemoData(): Promise<void> {
    localStorage.removeItem(DB_KEY)
    this.db = loadDb()
  }

  async exportDemoData(): Promise<string> {
    return JSON.stringify(this.db, null, 2)
  }

  async importDemoData(json: string): Promise<void> {
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      throw new ValidationError('Berkas bukan JSON yang valid.', 'file')
    }
    const db = parsed as Partial<StoredDatabase>
    if (
      !db || !Array.isArray(db.workspaces) || !Array.isArray(db.tasks) ||
      !Array.isArray(db.memberships) || !Array.isArray(db.profiles)
    ) {
      throw new ValidationError('Struktur data tidak dikenali.', 'file')
    }
    this.db = { ...db, comments: Array.isArray(db.comments) ? db.comments : [], seededAt: new Date().toISOString() } as StoredDatabase
    saveDb(this.db)
  }
}
