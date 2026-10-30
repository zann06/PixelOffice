import { useMemo, useState } from 'react'
import { PixelSelect } from '../../components/ui/PixelSelect'
import { useApp } from '../../app/store'
import { useToast } from '../../components/ui/Toast'
import { programProgress } from '../../lib/progress'
import { can, roleForUser } from '../../lib/permissions'
import { ProgramStatusBadge, TaskStatusBadge, TASK_STATUS_OPTIONS } from '../../components/ui/StatusBadge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { EmptyState, PermissionDenied } from '../../components/ui/States'
import { FormField, Select, TextArea, TextInput } from '../../components/ui/Form'
import { formatDate, formatRelative } from '../../lib/format'
import type { Program, ProgramStatus, Task, TaskStatus } from '../../types/data'
import { ValidationError } from '../../types/data'
import { IconPlus } from '../../components/ui/icons'

export function ProgramsPage() {
  const { snapshot, session, refresh } = useApp()
  const { showToast } = useToast()
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  if (!snapshot || !session?.userId) return null
  const myRole = roleForUser(snapshot.memberships, snapshot.workspace.id, session.userId)
  const programs = [...snapshot.programs].sort((a, b) => {
    const order: Record<ProgramStatus, number> = { active: 0, planned: 1, blocked: 2, completed: 3, archived: 4 }
    return order[a.status] - order[b.status] || a.title.localeCompare(b.title)
  })
  const detail = programs.find((p) => p.id === selectedProgram) ?? null

  const departmentName = (id: string) => snapshot.departments.find((d) => d.id === id)?.name ?? '—'

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Program Kerja</h1>
          <p className="text-sm text-text-muted">
            Progres dihitung dari tugas selesai dibanding seluruh tugas non-dibatalkan.
          </p>
        </div>
        {can(session.userId, snapshot.memberships, 'program:create', {
          workspaceId: snapshot.workspace.id,
          departmentId: myRole === 'lead' ? (snapshot.departments.find((d) => d.leadUserId === session.userId)?.id ?? null) : snapshot.departments[0]?.id ?? null,
          departments: snapshot.departments,
        }).allowed && (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <IconPlus /> Program baru
          </Button>
        )}
      </header>

      {programs.length === 0 ? (
        <EmptyState title="Belum ada program kerja" description="Program kerja pertama bisa dibuat oleh pemilik, admin, atau ketua divisi." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {programs.map((program) => {
            const progress = programProgress(program, snapshot.tasks)
            const owner = program.ownerUserId ? snapshot.profiles[program.ownerUserId]?.displayName : null
            return (
              <li key={program.id}>
                <button
                  type="button"
                  onClick={() => setSelectedProgram(program.id)}
                  className="flex h-full w-full flex-col gap-2 rounded-[12px] border border-border-main bg-surface p-4 text-left transition-colors hover:border-info"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{program.title}</span>
                    <ProgramStatusBadge status={program.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {departmentName(program.departmentId)} · PJ: {owner ?? 'Belum ditentukan'}
                  </p>
                  <ProgressBar progress={progress} size="sm" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {detail && (
        <ProgramDetail
          program={detail}
          onClose={() => setSelectedProgram(null)}
        />
      )}

      {createOpen && (
        <CreateProgramDialog
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false)
            await refresh()
            showToast('success', 'Program kerja dibuat.')
          }}
        />
      )}
    </div>
  )
}

function ProgramDetail({ program, onClose }: { program: Program; onClose: () => void }) {
  const { snapshot, session, client, refresh } = useApp()
  const { showToast } = useToast()
  const tasks = useMemo(
    () => snapshot?.tasks.filter((t) => t.programId === program.id) ?? [],
    [snapshot, program.id],
  )
  if (!snapshot || !session?.userId) return null

  const progress = programProgress(program, snapshot.tasks)
  const owner = program.ownerUserId ? snapshot.profiles[program.ownerUserId]?.displayName : null
  const department = snapshot.departments.find((d) => d.id === program.departmentId)
  const canArchive = can(session.userId, snapshot.memberships, 'program:archive', {
    workspaceId: program.workspaceId,
    departmentId: program.departmentId,
    departments: snapshot.departments,
  }).allowed
  const canUpdateStatus = can(session.userId, snapshot.memberships, 'program:update', {
    workspaceId: program.workspaceId,
    departmentId: program.departmentId,
    departments: snapshot.departments,
  }).allowed
  const activity = snapshot.activity
    .filter((a) => a.entityType === 'program' && a.entityId === program.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  async function changeStatus(status: ProgramStatus | TaskStatus, isTask = false, taskId?: string) {
    try {
      if (isTask && taskId) {
        await client.updateTask(taskId, { status: status as TaskStatus })
      } else {
        await client.updateProgramStatus(program.id, status as ProgramStatus)
      }
      await refresh()
      showToast('success', 'Perubahan tersimpan.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan.')
    }
  }

  return (
    <AccessibleDialog open onClose={onClose} title={program.title} variant="drawer">
      <div className="print-area flex flex-col gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <ProgramStatusBadge status={program.status} />
          <span className="text-xs text-text-muted">{department?.name}</span>
        </div>
        {program.objective && (
          <p>
            <span className="font-medium">Tujuan: </span>
            {program.objective}
          </p>
        )}
        {program.description && <p className="text-text-muted">{program.description}</p>}
        <p className="text-xs text-text-muted">
          PJ: {owner ?? '—'} · {program.startDate ? formatDate(program.startDate) : '—'} s.d. {program.dueDate ? formatDate(program.dueDate) : '—'} · Diperbarui {formatRelative(program.updatedAt)}
        </p>

        <div className="rounded-[8px] border border-border-main bg-surface-raised px-3 py-2">
          <ProgressBar progress={progress} />
          <p className="mt-1 text-[11px] text-text-muted">
            Rumus: tugas selesai ÷ (seluruh tugas − dibatalkan).
          </p>
        </div>

        <section aria-label="Ubah status program">
          {canUpdateStatus ? (
            <label className="flex items-center gap-2 text-xs text-text-muted">
              Status program:
              <PixelSelect
                className="rounded-[6px] border border-border-main bg-surface-raised px-2 py-1 text-xs"
                value={program.status}
                onChange={(e) => void changeStatus(e.target.value as ProgramStatus)}
              >
                {(['planned', 'active', 'blocked', 'completed', 'archived'] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </PixelSelect>
            </label>
          ) : canArchive ? (
            <Button
              onClick={async () => {
                await changeStatus('archived')
                onClose()
              }}
            >
              Arsipkan program
            </Button>
          ) : (
            <PermissionDenied message="Hanya pemilik, admin, atau ketua divisi ini yang dapat mengubah program." />
          )}
        </section>

        <section aria-label="Tugas dalam program">
          <h3 className="mb-2 text-sm font-semibold">Tugas ({tasks.length})</h3>
          {tasks.length === 0 ? (
            <p className="rounded-[8px] border border-dashed border-border-main px-3 py-3 text-center text-xs text-text-muted">
              Belum ada tugas — progres belum dapat dihitung.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((task) => (
                <li key={task.id} className="rounded-[8px] border border-border-main px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm">{task.title}</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <ProgramTaskStatusControl task={task} onChange={(status) => void changeStatus(status, true, task.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <Button
          onClick={() => window.print()}
          className="no-print self-start"
        >
          Cetak laporan program
        </Button>

        {activity.length > 0 && (
          <section aria-label="Riwayat program">
            <h3 className="mb-2 text-sm font-semibold">Riwayat terbaru</h3>
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
      </div>
    </AccessibleDialog>
  )
}

function ProgramTaskStatusControl({ task, onChange }: { task: Task; onChange: (status: TaskStatus) => void }) {
  const { snapshot, session } = useApp()
  if (!snapshot || !session?.userId) return null
  const allowed = can(session.userId, snapshot.memberships, 'task:update', {
    workspaceId: task.workspaceId,
    departmentId: task.departmentId,
    task,
    departments: snapshot.departments,
  }).allowed
  if (!allowed) {
    return (
      <p className="mt-1 text-[11px] text-text-muted">
        PJ: {task.assigneeUserId ? snapshot.profiles[task.assigneeUserId]?.displayName ?? '—' : 'belum ditugaskan'}
      </p>
    )
  }
  return (
    <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
      Ubah status:
      <PixelSelect
        className="rounded-[6px] border border-border-main bg-surface-raised px-2 py-1 text-xs"
        value={task.status}
        aria-label={`Ubah status tugas ${task.title}`}
        onChange={(e) => void onChange(e.target.value as TaskStatus)}
      >
        {TASK_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </PixelSelect>
    </label>
  )
}

function CreateProgramDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const { snapshot, session, client } = useApp()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [objective, setObjective] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [ownerUserId, setOwnerUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (!snapshot || !session?.userId) return null

  async function submit() {
    setBusy(true)
    setErrors({})
    try {
      await client.createProgram({
        workspaceId: snapshot!.workspace.id,
        departmentId,
        title,
        objective: objective || null,
        description: null,
        ownerUserId: ownerUserId || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
      })
      await onCreated()
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors({ [err.field ?? 'form']: err.message })
      } else {
        showToast('error', err instanceof Error ? err.message : 'Gagal membuat program.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccessibleDialog
      open
      onClose={onClose}
      title="Program kerja baru"
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
        <FormField label="Judul" htmlFor="program-title" error={errors.title}>
          <TextInput id="program-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={Boolean(errors.title)} maxLength={120} />
        </FormField>
        <FormField label="Departemen" htmlFor="program-dept" error={errors.departmentId}>
          <Select id="program-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Pilih departemen…</option>
            {snapshot.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Penanggung jawab" htmlFor="program-owner" hint="Boleh dikosongkan.">
          <Select id="program-owner" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
            <option value="">Belum ditentukan</option>
            {snapshot.memberships.map((m) => (
              <option key={m.userId} value={m.userId}>
                {snapshot.profiles[m.userId]?.displayName ?? m.userId}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Mulai" htmlFor="program-start">
            <TextInput id="program-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="Tenggat" htmlFor="program-due" error={errors.dueDate}>
            <TextInput id="program-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Tujuan" htmlFor="program-objective" error={errors.objective}>
          <TextArea id="program-objective" value={objective} onChange={(e) => setObjective(e.target.value)} maxLength={500} />
        </FormField>
        {errors.form && <p role="alert" className="text-xs text-danger">{errors.form}</p>}
      </form>
    </AccessibleDialog>
  )
}
