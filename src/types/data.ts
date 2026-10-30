/**
 * Domain types — mirrors docs/DATA_MODEL.md.
 *
 * The production target persists these in Postgres (Supabase) with Row Level
 * Security. This app currently ships with a local persistence adapter
 * (see src/lib/data/LocalDataClient.ts) that keeps the same shapes so the
 * swap to a real backend does not change the UI layer.
 */

export type Role = 'owner' | 'admin' | 'lead' | 'member' | 'viewer'

export type ProgramStatus = 'planned' | 'active' | 'blocked' | 'completed' | 'archived'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done' | 'cancelled'

export type TaskPriority = 'low' | 'normal' | 'high'

export interface Profile {
  id: string
  displayName: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  timezone: string
  visibility: 'private'
  createdAt: string
}

export interface WorkspaceMember {
  workspaceId: string
  userId: string
  role: Role
  joinedAt: string
  /** Explicit division/place the member belongs to (null/undefined = inferred from lead/tasks). */
  departmentId?: string | null
  /** Explicit office seat id (e.g. "workspace:3"); null/undefined = automatic seat for the division. */
  seatId?: string | null
}

export type AssignableRole = Exclude<Role, 'owner'>

export interface MemberAddInput {
  workspaceId: string
  displayName: string
  role: AssignableRole
  departmentId: string | null
  seatId: string | null
}

export interface MemberUpdateInput {
  role?: AssignableRole
  departmentId?: string | null
  seatId?: string | null
}

export interface Department {
  id: string
  workspaceId: string
  name: string
  description: string | null
  leadUserId: string | null
  createdAt: string
}

export interface Program {
  id: string
  workspaceId: string
  departmentId: string
  title: string
  objective: string | null
  description: string | null
  status: ProgramStatus
  ownerUserId: string | null
  startDate: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  workspaceId: string
  programId: string | null
  departmentId: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeUserId: string | null
  createdBy: string
  dueAt: string | null
  blockedReason: string | null
  /** Set when the task was created from a meeting decision (docs/USER_FLOWS.md Flow E). */
  decisionId: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface Meeting {
  id: string
  workspaceId: string
  departmentId: string | null
  title: string
  startsAt: string
  endsAt: string | null
  /** User-supplied link. Only https: is accepted — see src/lib/validation.ts. */
  meetingUrl: string | null
  agenda: string | null
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface TaskComment {
  id: string
  workspaceId: string
  taskId: string
  authorUserId: string
  body: string
  createdAt: string
}

export type AttendanceStatus = 'invited' | 'going' | 'attended' | 'absent'

export interface MeetingAttendee {
  meetingId: string
  userId: string
  attendanceStatus: AttendanceStatus
}

export interface Decision {
  id: string
  meetingId: string
  workspaceId: string
  summary: string
  createdBy: string
  createdAt: string
}

export type ActivityEntityType = 'task' | 'program' | 'meeting' | 'decision' | 'member'

export interface ActivityEvent {
  id: string
  workspaceId: string
  actorUserId: string | null
  entityType: ActivityEntityType
  entityId: string
  action: string
  /** Allowlisted string metadata only — never tokens or private note bodies. */
  metadata: Record<string, string>
  createdAt: string
}

export interface Session {
  /** null when signed out. In production this comes from Supabase Auth. */
  userId: string | null
}

export interface WorkspaceSnapshot {
  workspace: Workspace
  profiles: Record<string, Profile>
  memberships: WorkspaceMember[]
  departments: Department[]
  programs: Program[]
  tasks: Task[]
  meetings: Meeting[]
  attendees: MeetingAttendee[]
  decisions: Decision[]
  activity: ActivityEvent[]
  comments: TaskComment[]
  fetchedAt: string
}

export interface TaskCreateInput {
  workspaceId: string
  programId: string | null
  departmentId: string | null
  title: string
  description: string | null
  priority: TaskPriority
  assigneeUserId: string | null
  dueAt: string | null
}

export interface TaskUpdateInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigneeUserId?: string | null
  dueAt?: string | null
  blockedReason?: string | null
}

export interface ProgramCreateInput {
  workspaceId: string
  departmentId: string
  title: string
  objective: string | null
  description: string | null
  ownerUserId: string | null
  startDate: string | null
  dueDate: string | null
}

export interface MeetingCreateInput {
  workspaceId: string
  departmentId: string | null
  title: string
  startsAt: string
  endsAt: string | null
  meetingUrl: string | null
  agenda: string | null
  attendeeUserIds: string[]
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly reason: 'not_authenticated' | 'not_a_member' | 'cross_workspace' | 'insufficient_role',
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
