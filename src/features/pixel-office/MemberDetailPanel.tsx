import type { Task, TaskStatus, WorkspaceSnapshot } from '../../types/data'
import { PixelSelect } from '../../components/ui/PixelSelect'
import { editableTaskFields } from '../../lib/permissions'
import { formatDueLabel, formatDate } from '../../lib/format'
import { isTaskOverdue } from '../../lib/progress'
import { TaskStatusBadge, TASK_STATUS_OPTIONS } from '../../components/ui/StatusBadge'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { IconAlert } from '../../components/ui/icons'

interface Props {
  open: boolean
  memberUserId: string | null
  sessionUserId: string | null
  snapshot: WorkspaceSnapshot
  onClose: () => void
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>
}

/**
 * Opens from a character click or from the roster — both entry points show the
 * exact same information (docs/USER_FLOWS.md Flow F). Lists the member's real
 * saved tasks; inline status change is enabled per the permission matrix and
 * re-checked by the data adapter on save.
 */
export function MemberDetailPanel({ open, memberUserId, sessionUserId, snapshot, onClose, onStatusChange }: Props) {
  if (!memberUserId || !open) return null
  const membership = snapshot.memberships.find((m) => m.userId === memberUserId)
  if (!membership) return null
  const profile = snapshot.profiles[memberUserId]
  const ledDepartment = snapshot.departments.find((d) => d.leadUserId === memberUserId) ?? null
  const tasks = snapshot.tasks
    .filter((t) => t.assigneeUserId === memberUserId)
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'))

  return (
    <AccessibleDialog open={open} onClose={onClose} title={`Anggota: ${profile?.displayName ?? '—'}`} variant="drawer">
      <div className="flex flex-col gap-4">
        <div className="rounded-[8px] border border-border-main bg-surface-raised px-3 py-2 text-sm">
          <p className="font-medium">{profile?.displayName}</p>
          <p className="text-xs text-text-muted">
            {ledDepartment ? `Ketua divisi ${ledDepartment.name}` : 'Anggota'}
          </p>
        </div>

        <section aria-label="Tugas anggota ini">
          <h3 className="mb-2 text-sm font-semibold">Tugas ({tasks.length})</h3>
          {tasks.length === 0 ? (
            <p className="rounded-[8px] border border-dashed border-border-main px-3 py-4 text-center text-sm text-text-muted">
              Belum ada tugas yang ditugaskan.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((task) => (
                <MemberTaskItem
                  key={task.id}
                  task={task}
                  snapshot={snapshot}
                  sessionUserId={sessionUserId}
                  onStatusChange={onStatusChange}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </AccessibleDialog>
  )
}

function MemberTaskItem({
  task,
  snapshot,
  sessionUserId,
  onStatusChange,
}: {
  task: Task
  snapshot: WorkspaceSnapshot
  sessionUserId: string | null
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>
}) {
  const editable = editableTaskFields(
    snapshot.memberships.find((m) => m.userId === sessionUserId)?.role ?? null,
    task,
    sessionUserId,
    snapshot.memberships,
    snapshot.departments,
  )
  const now = new Date()
  const overdue = isTaskOverdue(task, now)
  const dueLabel = formatDueLabel(task.dueAt, now)
  const program = snapshot.programs.find((p) => p.id === task.programId)

  return (
    <li className="rounded-[8px] border border-border-main bg-surface px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{task.title}</p>
          <p className="text-xs text-text-muted">
            {program ? `Program: ${program.title}` : 'Tanpa program'} · Tenggat: {task.dueAt ? formatDate(task.dueAt) : 'tidak ditentukan'}
          </p>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>
      {task.status === 'blocked' && task.blockedReason && (
        <p className="mt-1 flex items-start gap-1 text-xs text-danger">
          <IconAlert width={12} height={12} /> {task.blockedReason}
        </p>
      )}
      {overdue && <p className="mt-1 text-xs font-medium text-danger tnum">{dueLabel}</p>}
      <div className="mt-2">
        {editable.status ? (
          <label className="flex items-center gap-2 text-xs text-text-muted">
            Ubah status:
            <PixelSelect
              className="rounded-[6px] border border-border-main bg-surface-raised px-2 py-1 text-xs"
              value={task.status}
              aria-label={`Ubah status tugas ${task.title}`}
              onChange={(e) => void onStatusChange(task, e.target.value as TaskStatus)}
            >
              <option value={task.status}>{TASK_STATUS_OPTIONS.find((o) => o.value === task.status)?.label}</option>
              {TASK_STATUS_OPTIONS.filter((o) => o.value !== task.status).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </PixelSelect>
          </label>
        ) : (
          <span className="text-xs text-text-muted">
            Status hanya dapat diubah oleh penanggung jawab tugas atau ketua divisi.
          </span>
        )}
      </div>
    </li>
  )
}
