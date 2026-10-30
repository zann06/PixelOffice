import { useState } from 'react'
import { useApp } from '../../app/store'
import { useToast } from '../../components/ui/Toast'
import { can } from '../../lib/permissions'
import { formatDateTime, formatTime, isSameDay } from '../../lib/format'
import { validateHttpsUrl } from '../../lib/validation'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { EmptyState, PermissionDenied } from '../../components/ui/States'
import { FormField, Select, TextArea, TextInput, Avatar } from '../../components/ui/Form'
import { TaskStatusBadge } from '../../components/ui/StatusBadge'
import { IconLink, IconPlus } from '../../components/ui/icons'
import type { Meeting, TaskPriority } from '../../types/data'
import { ValidationError } from '../../types/data'

export function MeetingsPage() {
  const { snapshot, session } = useApp()
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  if (!snapshot || !session?.userId) return null
  const now = new Date()
  const meetings = [...snapshot.meetings].sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const isLive = (m: Meeting) =>
    new Date(m.startsAt).getTime() <= now.getTime() && (!m.endsAt || new Date(m.endsAt).getTime() > now.getTime())
  const upcoming = meetings.filter((m) => isLive(m) || new Date(m.startsAt).getTime() >= now.getTime() - 60_000)
  const past = meetings.filter((m) => !isLive(m) && new Date(m.startsAt).getTime() < now.getTime() - 60_000)
  const selected = snapshot.meetings.find((m) => m.id === selectedMeetingId) ?? null

  const canCreate = can(session.userId, snapshot.memberships, 'meeting:create', {
    workspaceId: snapshot.workspace.id,
    departmentId: null,
    departments: snapshot.departments,
  }).allowed

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Rapat</h1>
          <p className="text-sm text-text-muted">Agenda, catatan, dan keputusan yang bisa ditindaklanjuti menjadi tugas.</p>
        </div>
        {canCreate ? (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <IconPlus /> Rapat baru
          </Button>
        ) : (
          <PermissionDenied message="Pembuatan rapat hanya untuk pemilik, admin, atau ketua divisi." />
        )}
      </header>

      {meetings.length === 0 ? (
        <EmptyState title="Belum ada rapat" description="Jadwalkan rapat pertama untuk mulai mencatat keputusan." />
      ) : (
        <>
          <section aria-label="Rapat mendatang / berlangsung">
            <h2 className="mb-2 text-sm font-semibold text-text-muted">Aktif & mendatang</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-text-muted">Tidak ada rapat terjadwal.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {upcoming.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} onOpen={() => setSelectedMeetingId(meeting.id)} now={now} />
                ))}
              </ul>
            )}
          </section>
          {past.length > 0 && (
            <section aria-label="Rapat selesai">
              <h2 className="mb-2 text-sm font-semibold text-text-muted">Selesai</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {past.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} onOpen={() => setSelectedMeetingId(meeting.id)} now={now} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {selected && (
        <MeetingDetail meeting={selected} onClose={() => setSelectedMeetingId(null)} />
      )}

      {createOpen && (
        <CreateMeetingDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false)
            setSelectedMeetingId(id)
            return Promise.resolve()
          }}
        />
      )}
    </div>
  )
}

function MeetingCard({ meeting, onOpen, now }: { meeting: Meeting; onOpen: () => void; now: Date }) {
  const { snapshot } = useApp()
  if (!snapshot) return null
  const attendees = snapshot.attendees.filter((a) => a.meetingId === meeting.id)
  const live = new Date(meeting.startsAt).getTime() <= now.getTime() && (!meeting.endsAt || new Date(meeting.endsAt).getTime() > now.getTime())

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col gap-2 rounded-[12px] border border-border-main bg-surface p-4 text-left transition-colors hover:border-info"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium">{meeting.title}</span>
          {live && (
            <span className="rounded-full border border-primary-strong/60 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Berlangsung
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted tnum">
          {formatDateTime(meeting.startsAt)}
          {meeting.endsAt ? ` – ${isSameDay(new Date(meeting.startsAt), new Date(meeting.endsAt)) ? formatTime(meeting.endsAt) : formatDateTime(meeting.endsAt)}` : ''}
        </p>
        <div className="flex items-center gap-1">
          {attendees.slice(0, 5).map((a) => (
            <Avatar key={a.userId} name={snapshot.profiles[a.userId]?.displayName ?? '?'} />
          ))}
          {attendees.length > 5 && <span className="text-xs text-text-muted">+{attendees.length - 5}</span>}
          <span className="ml-1 text-xs text-text-muted">{attendees.length} peserta</span>
        </div>
      </button>
    </li>
  )
}

function MeetingDetail({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const { snapshot, session, client, refresh } = useApp()
  const { showToast } = useToast()
  const [notes, setNotes] = useState(meeting.notes ?? '')
  const [decisionSummary, setDecisionSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [decisionFor, setDecisionFor] = useState<string | null>(null)

  if (!snapshot || !session?.userId) return null
  const attendees = snapshot.attendees.filter((a) => a.meetingId === meeting.id)
  const decisions = snapshot.decisions.filter((d) => d.meetingId === meeting.id)
  const followUpTasks = snapshot.tasks.filter((t) => t.decisionId && decisions.some((d) => d.id === t.decisionId))
  const canEdit = can(session.userId, snapshot.memberships, 'meeting:update', {
    workspaceId: meeting.workspaceId,
    departmentId: meeting.departmentId,
    departments: snapshot.departments,
  }).allowed
  const canAddDecision = can(session.userId, snapshot.memberships, 'decision:create', {
    workspaceId: meeting.workspaceId,
    departmentId: meeting.departmentId,
    departments: snapshot.departments,
  }).allowed

  async function saveNotes() {
    setBusy(true)
    try {
      await client.updateMeetingNotes(meeting.id, notes)
      await refresh()
      showToast('success', 'Catatan tersimpan.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan catatan.')
    } finally {
      setBusy(false)
    }
  }

  async function addDecision() {
    setBusy(true)
    try {
      await client.addDecision(meeting.id, decisionSummary)
      setDecisionSummary('')
      await refresh()
      showToast('success', 'Keputusan dicatat.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menambah keputusan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccessibleDialog open onClose={onClose} title={meeting.title} variant="drawer">
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-xs text-text-muted tnum">
          {formatDateTime(meeting.startsAt)}
          {meeting.endsAt ? ` – ${formatDateTime(meeting.endsAt)}` : ''}
        </p>

        {meeting.meetingUrl && (
          <a
            href={meeting.meetingUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-2 text-sm font-medium text-info underline underline-offset-2"
          >
            <IconLink /> Gabung rapat (tautan eksternal)
          </a>
        )}

        {meeting.agenda && (
          <section aria-label="Agenda">
            <h3 className="mb-1 text-sm font-semibold">Agenda</h3>
            <p className="whitespace-pre-line text-text-muted">{meeting.agenda}</p>
          </section>
        )}

        <section aria-label="Peserta">
          <h3 className="mb-1 text-sm font-semibold">Peserta ({attendees.length})</h3>
          <ul className="flex flex-wrap gap-2">
            {attendees.map((a) => (
              <li key={a.userId} className="flex items-center gap-1.5 rounded-full border border-border-main px-2 py-1 text-xs">
                <Avatar name={snapshot.profiles[a.userId]?.displayName ?? '?'} />
                {snapshot.profiles[a.userId]?.displayName ?? a.userId}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Catatan">
          <h3 className="mb-1 text-sm font-semibold">Catatan</h3>
          {canEdit ? (
            <div className="flex flex-col gap-2">
              <TextArea
                aria-label="Catatan rapat"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={8000}
                rows={4}
              />
              <Button onClick={() => void saveNotes()} disabled={busy} className="self-start">
                {busy ? 'Menyimpan…' : 'Simpan catatan'}
              </Button>
            </div>
          ) : (
            <p className="whitespace-pre-line text-text-muted">{meeting.notes ?? 'Belum ada catatan.'}</p>
          )}
        </section>

        <section aria-label="Keputusan">
          <h3 className="mb-1 text-sm font-semibold">Keputusan ({decisions.length})</h3>
          {decisions.length === 0 ? (
            <p className="text-xs text-text-muted">Belum ada keputusan yang dicatat.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {decisions.map((decision) => {
                const linkedTask = snapshot.tasks.find((t) => t.decisionId === decision.id)
                return (
                  <li key={decision.id} className="rounded-[8px] border border-border-main px-3 py-2">
                    <p>{decision.summary}</p>
                    {linkedTask ? (
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        Tindak lanjut: <span className="text-text-main">{linkedTask.title}</span>
                        <TaskStatusBadge status={linkedTask.status} />
                      </p>
                    ) : canEdit ? (
                      <Button className="mt-2" onClick={() => setDecisionFor(decision.id)}>
                        Jadikan tugas
                      </Button>
                    ) : (
                      <p className="mt-1 text-xs text-text-muted">Belum ada tugas tindak lanjut.</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {canAddDecision && (
            <div className="mt-3 flex flex-col gap-2">
              <FormField label="Catat keputusan baru" htmlFor="decision-summary">
                <TextArea
                  id="decision-summary"
                  value={decisionSummary}
                  onChange={(e) => setDecisionSummary(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </FormField>
              <Button onClick={() => void addDecision()} disabled={busy || decisionSummary.trim().length < 3} className="self-start">
                Tambah keputusan
              </Button>
            </div>
          )}
          {followUpTasks.length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              {followUpTasks.length} keputusan rapat ini sudah menjadi tugas tindak lanjut.
            </p>
          )}
        </section>
      </div>

      {decisionFor && (
        <DecisionTaskDialog
          decisionId={decisionFor}
          decisionSummary={decisions.find((d) => d.id === decisionFor)?.summary ?? ''}
          onClose={() => setDecisionFor(null)}
          onCreated={async () => {
            setDecisionFor(null)
            await refresh()
            showToast('success', 'Tugas tindak lanjut dibuat dari keputusan.')
          }}
        />
      )}
    </AccessibleDialog>
  )
}

/** Flow E: convert a decision into a follow-up task (single, linked, no duplicate). */
function DecisionTaskDialog({
  decisionId,
  decisionSummary,
  onClose,
  onCreated,
}: {
  decisionId: string
  decisionSummary: string
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const { snapshot, session, client } = useApp()
  const { showToast } = useToast()
  const [title, setTitle] = useState(decisionSummary.slice(0, 80))
  const [assigneeUserId, setAssigneeUserId] = useState('')
  const [programId, setProgramId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueAt, setDueAt] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (!snapshot || !session?.userId) return null
  const decision = snapshot.decisions.find((d) => d.id === decisionId)
  const meeting = decision ? snapshot.meetings.find((m) => m.id === decision.meetingId) : null

  async function submit() {
    setBusy(true)
    setErrors({})
    try {
      await client.createTaskFromDecision(decisionId, {
        title,
        assigneeUserId: assigneeUserId || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        departmentId: meeting?.departmentId ?? null,
        programId: programId || null,
        priority,
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
      title="Tugas tindak lanjut"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Menyimpan…' : 'Buat tugas'}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <p className="rounded-[8px] border border-border-main bg-surface-raised px-3 py-2 text-xs text-text-muted">
          Dari keputusan: {decisionSummary}
        </p>
        <FormField label="Judul tugas" htmlFor="decision-task-title" error={errors.title}>
          <TextInput id="decision-task-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={Boolean(errors.title)} maxLength={120} />
        </FormField>
        <FormField label="Penanggung jawab" htmlFor="decision-task-assignee">
          <Select id="decision-task-assignee" value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
            <option value="">Belum ditugaskan</option>
            {snapshot.memberships.map((m) => (
              <option key={m.userId} value={m.userId}>
                {snapshot.profiles[m.userId]?.displayName ?? m.userId}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Program kerja" htmlFor="decision-task-program" hint="Opsional.">
          <Select id="decision-task-program" value={programId} onChange={(e) => setProgramId(e.target.value)}>
            <option value="">Tanpa program</option>
            {snapshot.programs.filter((p) => p.status !== 'archived').map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Prioritas" htmlFor="decision-task-priority">
            <Select id="decision-task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Rendah</option>
              <option value="normal">Normal</option>
              <option value="high">Tinggi</option>
            </Select>
          </FormField>
          <FormField label="Tenggat" htmlFor="decision-task-due" error={errors.dueAt}>
            <TextInput id="decision-task-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </FormField>
        </div>
        {errors.decisionId && <p role="alert" className="text-xs text-danger">{errors.decisionId}</p>}
      </form>
    </AccessibleDialog>
  )
}

function CreateMeetingDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => Promise<void> }) {
  const { snapshot, session, client } = useApp()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [agenda, setAgenda] = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (!snapshot || !session?.userId) return null

  async function submit() {
    setBusy(true)
    setErrors({})
    try {
      const url = validateHttpsUrl(meetingUrl)
      const meeting = await client.createMeeting({
        workspaceId: snapshot!.workspace.id,
        departmentId: null,
        title,
        startsAt: startsAt ? new Date(startsAt).toISOString() : '',
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        meetingUrl: url,
        agenda: agenda || null,
        attendeeUserIds: attendees,
      })
      await onCreated(meeting.id)
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors({ [err.field ?? 'form']: err.message })
      } else {
        showToast('error', err instanceof Error ? err.message : 'Gagal membuat rapat.')
      }
    } finally {
      setBusy(false)
    }
  }

  function toggleAttendee(userId: string, checked: boolean) {
    setAttendees((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)))
  }

  return (
    <AccessibleDialog
      open
      onClose={onClose}
      title="Rapat baru"
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
        <FormField label="Judul" htmlFor="meeting-title" error={errors.title}>
          <TextInput id="meeting-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={Boolean(errors.title)} maxLength={120} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Mulai" htmlFor="meeting-start" error={errors.startsAt}>
            <TextInput id="meeting-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </FormField>
          <FormField label="Selesai" htmlFor="meeting-end" error={errors.endsAt} hint="Harus setelah waktu mulai.">
            <TextInput id="meeting-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </FormField>
        </div>
        <FormField
          label="Tautan rapat (opsional)"
          htmlFor="meeting-url"
          error={errors.meetingUrl}
          hint="Hanya https:// yang diterima, misalnya tautan video conference dari penyedia tepercaya."
        >
          <TextInput id="meeting-url" type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://…" invalid={Boolean(errors.meetingUrl)} />
        </FormField>
        <FormField label="Agenda" htmlFor="meeting-agenda" error={errors.agenda}>
          <TextArea id="meeting-agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} maxLength={4000} />
        </FormField>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Peserta</legend>
          <div className="grid grid-cols-2 gap-1">
            {snapshot.memberships.map((m) => (
              <label key={m.userId} className="flex items-center gap-2 rounded-[6px] px-2 py-1 text-sm hover:bg-surface-raised">
                <input
                  type="checkbox"
                  checked={attendees.includes(m.userId)}
                  onChange={(e) => toggleAttendee(m.userId, e.target.checked)}
                />
                {snapshot.profiles[m.userId]?.displayName ?? m.userId}
              </label>
            ))}
          </div>
          {errors.attendeeUserIds && <p role="alert" className="text-xs text-danger">{errors.attendeeUserIds}</p>}
        </fieldset>
        {errors.form && <p role="alert" className="text-xs text-danger">{errors.form}</p>}
      </form>
    </AccessibleDialog>
  )
}
