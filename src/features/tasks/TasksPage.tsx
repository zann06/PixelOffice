import { useMemo, useState } from 'react'
import { PixelSelect } from '../../components/ui/PixelSelect'
import { useApp } from '../../app/store'
import { useToast } from '../../components/ui/Toast'
import { can, editableTaskFields, roleForUser } from '../../lib/permissions'
import { isTaskOverdue } from '../../lib/progress'
import { formatDueLabel, formatDate, formatRelative } from '../../lib/format'
import { TaskStatusBadge, TASK_STATUS_OPTIONS } from '../../components/ui/StatusBadge'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { EmptyState, PermissionDenied } from '../../components/ui/States'
import { FormField, Select, TextArea, TextInput } from '../../components/ui/Form'
import { IconPlus, IconSearch, IconAlert } from '../../components/ui/icons'
import type { Task, TaskPriority, Recurrence, TaskStatus } from '../../types/data'
import { ValidationError } from '../../types/data'

type StatusFilter = 'all' | TaskStatus | 'overdue'
/** 'all' | 'me' | 'unassigned' | <userId> */
type AssigneeFilter = 'all' | 'me' | 'unassigned' | (string & Record<never, never>)

export function TasksPage() {
  const { snapshot, session, client, refresh } = useApp()
  const { showToast } = useToast()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all')
  const [query, setQuery] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState<'list' | 'board'>('list')

  const myUserId = session?.userId ?? null
  const now = useMemo(() => new Date(), [snapshot?.fetchedAt])

  const filtered = useMemo(() => {
    if (!snapshot || !myUserId) return []
    const q = query.trim().toLowerCase()
    return snapshot.tasks
      .filter((task) => {
        if (statusFilter === 'overdue' && !isTaskOverdue(task, now)) return false
        if (statusFilter !== 'all' && statusFilter !== 'overdue' && task.status !== statusFilter) return false
        if (assigneeFilter === 'me' && task.assigneeUserId !== myUserId) return false
        if (assigneeFilter === 'unassigned' && task.assigneeUserId !== null) return false
        if (assigneeFilter !== 'all' && assigneeFilter !== 'me' && assigneeFilter !== 'unassigned' && task.assigneeUserId !== assigneeFilter) return false
        if (q && !task.title.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        const overdueDiff = Number(isTaskOverdue(b, now)) - Number(isTaskOverdue(a, now))
        if (overdueDiff !== 0) return overdueDiff
        return (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999')
      })
  }, [snapshot, myUserId, statusFilter, assigneeFilter, query, now])

  if (!snapshot || !myUserId) return null

  const myRole = roleForUser(snapshot.memberships, snapshot.workspace.id, myUserId)
  const myLedDepartments = snapshot.departments.filter((d) => d.leadUserId === myUserId).map((d) => d.id)

  const selectedTask = snapshot.tasks.find((t) => t.id === selectedTaskId) ?? null
  const canCreate = can(myUserId, snapshot.memberships, 'task:create', {
    workspaceId: snapshot.workspace.id,
    departmentId: myRole === 'lead' ? myLedDepartments[0] ?? null : snapshot.departments[0]?.id ?? null,
    departments: snapshot.departments,
  }).allowed

  async function handleStatusChange(task: Task, status: TaskStatus) {
    try {
      await client.updateTask(task.id, { status })
      await refresh()
      showToast('success', 'Status tugas tersimpan.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan status.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tugas</h1>
          <p className="text-sm text-text-muted">
            {filtered.length} dari {snapshot.tasks.length} tugas. Tugas terlambat ditampilkan lebih dulu.
          </p>
        </div>
        {canCreate ? (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <IconPlus /> Tugas baru
          </Button>
        ) : (
          <PermissionDenied message="Pembuatan tugas hanya untuk pemilik, admin, atau ketua divisi." />
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter tugas">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <IconSearch aria-hidden />
          <span className="sr-only">Cari tugas</span>
          <TextInput
            type="search"
            placeholder="Cari judul tugas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56"
            aria-label="Cari tugas"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Status
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-44"
            aria-label="Filter status"
          >
            <option value="all">Semua status</option>
            <option value="overdue">Terlambat</option>
            {TASK_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Penanggung jawab
          <Select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-48"
            aria-label="Filter penanggung jawab"
          >
            <option value="all">Semua</option>
            <option value="me">Tugas saya</option>
            <option value="unassigned">Belum ditugaskan</option>
            {snapshot.memberships.map((m) => (
              <option key={m.userId} value={m.userId}>
                {snapshot.profiles[m.userId]?.displayName ?? m.userId}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="flex rounded-[8px] border border-border-main p-0.5" role="group" aria-label="Mode tampilan tugas">
        <button
          type="button"
          aria-pressed={view === 'list'}
          onClick={() => setView('list')}
          className={`rounded-[6px] px-3 py-1 text-sm ${view === 'list' ? 'bg-surface-raised text-text-main' : 'text-text-muted'}`}
        >
          Daftar
        </button>
        <button
          type="button"
          aria-pressed={view === 'board'}
          onClick={() => setView('board')}
          className={`rounded-[6px] px-3 py-1 text-sm ${view === 'board' ? 'bg-surface-raised text-text-main' : 'text-text-muted'}`}
        >
          Papan
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada tugas yang cocok"
          description="Coba ubah filter atau kata kunci pencarian."
        />
      ) : view === 'board' ? (
        <TaskBoard
          tasks={filtered}
          selectedTaskId={selectedTaskId}
          onOpen={setSelectedTaskId}
          onStatusChange={handleStatusChange}
          sessionUserId={myUserId}
        />
      ) : (
        <ul key="list" className="fade-up flex flex-col gap-2">
          {filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onOpen={() => setSelectedTaskId(task.id)}
              onStatusChange={(status) => void handleStatusChange(task, status)}
              sessionUserId={myUserId}
            />
          ))}
        </ul>
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {createOpen && (
        <CreateTaskDialog
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false)
            await refresh()
            showToast('success', 'Tugas dibuat.')
          }}
        />
      )}
    </div>
  )
}

function TaskRow({
  task,
  onOpen,
  onStatusChange,
  sessionUserId,
}: {
  task: Task
  onOpen: () => void
  onStatusChange: (status: TaskStatus) => void
  sessionUserId: string
}) {
  const { snapshot } = useApp()
  if (!snapshot) return null
  const now = new Date()
  const overdue = isTaskOverdue(task, now)
  const dueLabel = formatDueLabel(task.dueAt, now)
  const assignee = task.assigneeUserId ? snapshot.profiles[task.assigneeUserId]?.displayName : null
  const program = snapshot.programs.find((p) => p.id === task.programId)
  const editable = editableTaskFields(
    snapshot.memberships.find((m) => m.userId === sessionUserId)?.role ?? null,
    task,
    sessionUserId,
    snapshot.memberships,
    snapshot.departments,
  )

  return (
    <li className="rounded-[12px] border border-border-main bg-surface px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="block font-medium hover:underline">{task.title}</span>
          <span className="mt-0.5 block text-xs text-text-muted">
            {program ? `Program: ${program.title}` : 'Tanpa program'} · PJ: {assignee ?? 'Belum ditugaskan'}
            {task.dueAt ? ` · Tenggat ${formatDate(task.dueAt)}` : ''}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full border border-danger/60 bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
              <IconAlert width={11} height={11} /> {dueLabel}
            </span>
          )}
          {task.priority === 'high' && (
            <span className="rounded-full border border-warning/60 bg-warning/10 px-2 py-0.5 text-xs text-warning">
              Prioritas tinggi
            </span>
          )}
          <TaskStatusBadge status={task.status} />
          {editable.status && (
            <label className="sr-only" htmlFor={`status-${task.id}`}>
              Ubah status {task.title}
            </label>
          )}
          {editable.status && (
            <PixelSelect
              id={`status-${task.id}`}
              className="rounded-[6px] border border-border-main bg-surface-raised px-2 py-1 text-xs"
              value={task.status}
              onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            >
              {TASK_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </PixelSelect>
          )}
        </div>
      </div>
    </li>
  )
}

function TaskDetailPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const { snapshot, session, client, refresh } = useApp()
  const { showToast } = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!snapshot || !session?.userId) return null

  const editable = editableTaskFields(
    snapshot.memberships.find((m) => m.userId === session.userId)?.role ?? null,
    task,
    session.userId,
    snapshot.memberships,
    snapshot.departments,
  )
  const program = snapshot.programs.find((p) => p.id === task.programId)
  const decision = task.decisionId ? snapshot.decisions.find((d) => d.id === task.decisionId) : null
  const meeting = decision ? snapshot.meetings.find((m) => m.id === decision.meetingId) : null
  const activity = snapshot.activity
    .filter((a) => a.entityType === 'task' && a.entityId === task.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)

  async function patch(fields: Parameters<typeof client.updateTask>[1]) {
    setBusy(true)
    try {
      await client.updateTask(task.id, fields)
      await refresh()
      showToast('success', 'Tersimpan.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await client.deleteTask(task.id)
      await refresh()
      setDeleteOpen(false)
      onClose()
      showToast('success', 'Tugas dihapus.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus.')
      setDeleteOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const canDelete = can(session.userId, snapshot.memberships, 'task:delete', {
    workspaceId: task.workspaceId,
    departmentId: task.departmentId,
    task,
    departments: snapshot.departments,
  }).allowed

  return (
    <>
      <AccessibleDialog open onClose={onClose} title={task.title} variant="drawer">
        <div className="flex flex-col gap-4 text-sm">
          <TaskStatusBadge status={task.status} />
          {program && (
            <p className="text-text-muted">
              Program: <span className="text-text-main">{program.title}</span>
            </p>
          )}
          {decision && meeting && (
            <p className="rounded-[8px] border border-border-main bg-surface-raised px-3 py-2 text-xs text-text-muted">
              Tindak lanjut keputusan rapat “{meeting.title}”: {decision.summary}
            </p>
          )}
          {task.description && <p className="whitespace-pre-line text-text-muted">{task.description}</p>}
          {task.recurrence && (
            <p className="text-xs text-text-muted">
              ↻ Tugas berulang {task.recurrence === 'weekly' ? 'mingguan' : 'bulanan'} — salinan baru otomatis dibuat setelah ditandai selesai.
            </p>
          )}
          {task.status === 'blocked' && (
            <p className="flex items-start gap-1 rounded-[8px] border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">
              <IconAlert /> {task.blockedReason ?? 'Ditandai terhambat tanpa alasan.'}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {editable.assignee && (
              <FormField label="Penanggung jawab" htmlFor="task-assignee">
                <Select id="task-assignee" value={task.assigneeUserId ?? ''} onChange={(e) => void patch({ assigneeUserId: e.target.value || null })} disabled={busy}>
                  <option value="">Belum ditugaskan</option>
                  {snapshot.memberships.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {snapshot.profiles[m.userId]?.displayName ?? m.userId}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {editable.dueAt && (
              <FormField label="Tenggat" htmlFor="task-due">
                <TextInput
                  id="task-due"
                  type="date"
                  value={task.dueAt ? task.dueAt.slice(0, 10) : ''}
                  onChange={(e) => void patch({ dueAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  disabled={busy}
                />
              </FormField>
            )}
            {editable.priority && (
              <FormField label="Prioritas" htmlFor="task-priority">
                <Select
                  id="task-priority"
                  value={task.priority}
                  onChange={(e) => void patch({ priority: e.target.value as TaskPriority })}
                  disabled={busy}
                >
                  <option value="low">Rendah</option>
                  <option value="normal">Normal</option>
                  <option value="high">Tinggi</option>
                </Select>
              </FormField>
            )}
            <FormField label="Status" htmlFor="task-status-detail">
              {editable.status ? (
                <Select id="task-status-detail" value={task.status} onChange={(e) => void patch({ status: e.target.value as TaskStatus })} disabled={busy}>
                  {TASK_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <PermissionDenied message="Hanya PJ tugas / ketua divisi yang dapat mengubah." />
              )}
            </FormField>
          </div>

          {editable.description && (
            <FormField label="Deskripsi" htmlFor="task-desc" hint={`${(task.description ?? '').length}/2000`}>
              <TextArea
                id="task-desc"
                value={task.description ?? ''}
                onChange={(e) => void patch({ description: e.target.value })}
                maxLength={2000}
                disabled={busy}
              />
            </FormField>
          )}

          {activity.length > 0 && (
            <section aria-label="Riwayat tugas">
              <h3 className="mb-1 text-sm font-semibold">Riwayat</h3>
              <ul className="flex flex-col gap-1 text-xs text-text-muted">
                {activity.map((event) => (
                  <li key={event.id}>
                    {event.action} · {formatRelative(event.createdAt)}
                    {event.actorUserId ? ` · ${snapshot.profiles[event.actorUserId]?.displayName ?? ''}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CommentsSection task={task} />

          {canDelete && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={busy}>
              Hapus tugas
            </Button>
          )}
        </div>
      </AccessibleDialog>

      <ConfirmDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void remove()}
        title="Hapus tugas?"
        message={`Tugas “${task.title}” akan dihapus permanen dari demo dataset ini. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        busy={busy}
      />
    </>
  )
}

function CreateTaskDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const { snapshot, session, client } = useApp()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [programId, setProgramId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [assigneeUserId, setAssigneeUserId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueAt, setDueAt] = useState('')
  const [description, setDescription] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence | ''>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (!snapshot || !session?.userId) return null

  async function submit() {
    setBusy(true)
    setErrors({})
    try {
      await client.createTask({
        workspaceId: snapshot!.workspace.id,
        programId: programId || null,
        departmentId: departmentId || null,
        title,
        description: description || null,
        priority,
        assigneeUserId: assigneeUserId || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        recurrence: recurrence || null,
      })
      await onCreated()
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors({ [err.field ?? 'form']: err.message })
      } else {
        showToast('error', err instanceof Error ? err.message : 'Gagal membuat tugas.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccessibleDialog
      open
      onClose={onClose}
      title="Tugas baru"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <FormField label="Judul" htmlFor="task-title" error={errors.title}>
          <TextInput id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={Boolean(errors.title)} maxLength={120} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Program kerja" htmlFor="task-program" hint="Opsional.">
            <Select id="task-program" value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="">Tanpa program</option>
              {snapshot.programs.filter((p) => p.status !== 'archived').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Departemen" htmlFor="task-dept" error={errors.departmentId}>
            <Select id="task-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Tanpa departemen</option>
              {snapshot.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Penanggung jawab" htmlFor="task-assignee" error={errors.assigneeUserId}>
            <Select id="task-assignee" value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
              <option value="">Belum ditugaskan</option>
              {snapshot.memberships.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {snapshot.profiles[m.userId]?.displayName ?? m.userId}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Prioritas" htmlFor="task-priority-new">
            <Select id="task-priority-new" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Rendah</option>
              <option value="normal">Normal</option>
              <option value="high">Tinggi</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Tenggat" htmlFor="task-due-new" error={errors.dueAt}>
          <TextInput id="task-due-new" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </FormField>
        <FormField
          label="Pengulangan"
          htmlFor="task-recurrence-new"
          hint="Tugas berulang otomatis muncul lagi sebagai tugas baru setelah ditandai selesai."
        >
          <Select
            id="task-recurrence-new"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence | '')}
          >
            <option value="">Tidak berulang</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </Select>
        </FormField>
        <FormField label="Deskripsi" htmlFor="task-desc-new" error={errors.description}>
          <TextArea id="task-desc-new" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </FormField>
        {errors.form && <p role="alert" className="text-xs text-danger">{errors.form}</p>}
      </form>
    </AccessibleDialog>
  )
}

/** Task discussion (PRD P0 #7) — real persisted comments, permission-aware. */
function CommentsSection({ task }: { task: Task }) {
  const { snapshot, session, client, refresh } = useApp()
  const { showToast } = useToast()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  if (!snapshot || !session?.userId) return null

  const comments = snapshot.comments
    .filter((c) => c.taskId === task.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const myRole = roleForUser(snapshot.memberships, snapshot.workspace.id, session.userId)
  const canComment = myRole !== null && myRole !== 'viewer'

  async function submit() {
    setBusy(true)
    try {
      await client.addTaskComment(task.id, body)
      setBody('')
      await refresh()
      showToast('success', 'Komentar terkirim.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengirim komentar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Diskusi tugas" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Diskusi ({comments.length})</h3>
      {comments.length === 0 ? (
        <p className="text-xs text-text-muted">Belum ada komentar.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-[8px] border border-border-main bg-surface-raised px-3 py-2">
              <p className="text-xs font-medium">
                {snapshot.profiles[comment.authorUserId]?.displayName ?? comment.authorUserId}
                <span className="ml-2 font-normal text-text-muted tnum">{formatRelative(comment.createdAt)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-line text-sm">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
      {canComment ? (
        <div className="flex flex-col gap-2">
          <TextArea
            aria-label="Tulis komentar"
            placeholder="Tulis komentar…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={2}
          />
          <Button className="self-start" onClick={() => void submit()} disabled={busy || body.trim().length === 0}>
            {busy ? 'Mengirim…' : 'Kirim komentar'}
          </Button>
        </div>
      ) : (
        <PermissionDenied message="Pengamat hanya dapat membaca diskusi." />
      )}
    </section>
  )
}

const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = TASK_STATUS_OPTIONS.map((o) => ({
  status: o.value,
  label: o.label,
}))

/**
 * Kanban board: drag a card between columns to change its status (adapter
 * re-checks permission), or click the card to open the detail panel where the
 * status is also editable — keyboard users are never blocked by drag-only.
 */
function TaskBoard({
  tasks,
  selectedTaskId,
  onOpen,
  onStatusChange,
  sessionUserId,
}: {
  tasks: Task[]
  selectedTaskId: string | null
  onOpen: (taskId: string) => void
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>
  sessionUserId: string
}) {
  const { snapshot } = useApp()
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null)
  if (!snapshot) return null

  return (
    <div className="fade-up flex gap-3 overflow-x-auto pb-2" role="list" aria-label="Papan tugas per status">
      {BOARD_COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.status)
        return (
          <section
            key={column.status}
            aria-label={`${column.label} (${columnTasks.length})`}
            className={`min-w-56 flex-1 rounded-[12px] border p-2 transition-colors ${
              dragOver === column.status ? 'border-info bg-info/5' : 'border-border-main bg-surface'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(column.status)
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(null)
              const taskId = e.dataTransfer.getData('text/plain')
              const task = tasks.find((t) => t.id === taskId)
              if (task && task.status !== column.status) void onStatusChange(task, column.status)
            }}
          >
            <h3 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {column.label}
              <span className="rounded-full bg-surface-raised px-1.5 tnum">{columnTasks.length}</span>
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              {columnTasks.map((task) => {
                const editable = can(sessionUserId, snapshot.memberships, 'task:update', {
                  workspaceId: task.workspaceId,
                  departmentId: task.departmentId,
                  task,
                  departments: snapshot.departments,
                }).allowed
                return (
                  <li
                    key={task.id}
                    role="listitem"
                    draggable={editable}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className={`rounded-[8px] border border-border-main bg-surface-raised px-3 py-2 ${
                      editable ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${selectedTaskId === task.id ? 'border-info' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(task.id)}
                      className="block w-full text-left"
                      aria-label={`Buka detail tugas ${task.title}`}
                    >
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-text-muted">
                        {task.assigneeUserId
                          ? snapshot.profiles[task.assigneeUserId]?.displayName
                          : 'Belum ditugaskan'}
                        {task.dueAt ? ` · ${formatDate(task.dueAt)}` : ''}
                        {task.recurrence ? ' · ↻' : ''}
                      </span>
                    </button>
                    {editable && (
                      <p className="mt-1 text-[10px] text-text-muted/70" aria-hidden>
                        Geser ke kolom lain untuk mengubah status
                      </p>
                    )}
                  </li>
                )
              })}
              {columnTasks.length === 0 && (
                <li className="rounded-[8px] border border-dashed border-border-main px-2 py-4 text-center text-xs text-text-muted">
                  Kosong
                </li>
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
