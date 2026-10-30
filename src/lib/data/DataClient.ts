import type {
  Department,
  DepartmentCreateInput,
  Meeting,
  Workspace,
  WorkspaceCreateInput,
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
} from '../../types/data'

/**
 * The typed data-access boundary (docs/ARCHITECTURE.md §1 "Typed data-access
 * layer"). The UI never touches storage directly; swapping the local demo
 * adapter for a Supabase-backed adapter means implementing this interface.
 *
 * Authorization semantics belong in the adapter (in production: RLS).
 */
export interface DataClient {
  /** Demo auth. Production replaces this with Supabase Auth. */
  getSession(): Promise<Session>
  signInAs(userId: string): Promise<Session>
  signOut(): Promise<void>

  listWorkspacesForSession(): Promise<{ id: string; name: string }[]>
  fetchWorkspace(workspaceId: string): Promise<WorkspaceSnapshot>

  createTask(input: TaskCreateInput): Promise<Task>
  updateTask(taskId: string, patch: TaskUpdateInput): Promise<Task>
  deleteTask(taskId: string): Promise<void>

  createProgram(input: ProgramCreateInput): Promise<Program>
  updateProgramStatus(programId: string, status: Program['status']): Promise<Program>

  createMeeting(input: MeetingCreateInput): Promise<Meeting>
  updateMeetingNotes(meetingId: string, notes: string | null, agenda?: string | null): Promise<Meeting>
  addDecision(meetingId: string, summary: string): Promise<void>
  addTaskComment(taskId: string, body: string): Promise<void>
  createWorkspace(input: WorkspaceCreateInput): Promise<Workspace>
  createDepartment(input: DepartmentCreateInput): Promise<Department>
  createTaskFromDecision(decisionId: string, input: { title: string; assigneeUserId: string | null; dueAt: string | null; departmentId: string | null; programId: string | null; priority: Task['priority'] }): Promise<Task>

  /** Owner/admin only. Adds a member (demo: creates a local profile; production: an invitation). */
  addMember(input: MemberAddInput): Promise<WorkspaceMember>
  /** Owner/admin only. Changes role, division and/or fixed seat of an existing member. */
  updateMember(workspaceId: string, userId: string, patch: MemberUpdateInput): Promise<WorkspaceMember>

  /** Demo maintenance: wipes localStorage and reseeds. Confirmed in UI first. */
  resetDemoData(): Promise<void>
  /** Demo maintenance: serialize the whole demo dataset (no secrets inside). */
  exportDemoData(): Promise<string>
  /** Demo maintenance: replace the demo dataset after UI confirmation. */
  importDemoData(json: string): Promise<void>
}
