import { useState } from 'react'
import { useApp } from '../../app/store'
import { programProgress, isTaskOverdue } from '../../lib/progress'
import { RoleBadge } from '../../components/ui/StatusBadge'
import { Avatar } from '../../components/ui/Form'
import { EmptyState } from '../../components/ui/States'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { FormField, TextInput } from '../../components/ui/Form'
import { formatDate } from '../../lib/format'
import { MemberDetailPanel } from '../pixel-office/MemberDetailPanel'
import type { Task, TaskStatus } from '../../types/data'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { MemberFormDialog } from './MemberFormDialog'
import { buildSceneViewModel } from '../pixel-office/sceneViewModel'
import { atLeast } from '../../lib/permissions'

export function MembersPage() {
  const { snapshot, session, client, refresh } = useApp()
  const { showToast } = useToast()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [form, setForm] = useState<{ editUserId: string | null } | null>(null)
  if (!snapshot || !session?.userId) return null
  const now = new Date()
  const myRole = snapshot.memberships.find((m) => m.userId === session.userId)?.role
  const canManage = myRole ? atLeast(myRole, 'admin') : false
  const [deptOpen, setDeptOpen] = useState(false)
  const [deptName, setDeptName] = useState('')
  const [deptDesc, setDeptDesc] = useState('')
  const [deptError, setDeptError] = useState<string | null>(null)
  const [deptBusy, setDeptBusy] = useState(false)

  const wsId = snapshot.workspace.id
  async function createDepartment() {
    setDeptBusy(true)
    setDeptError(null)
    try {
      await client.createDepartment({ workspaceId: wsId, name: deptName, description: deptDesc || null })
      setDeptOpen(false)
      setDeptName('')
      setDeptDesc('')
      await refresh()
      showToast('success', 'Departemen dibuat.')
    } catch (err) {
      setDeptError(err instanceof Error ? err.message : 'Gagal membuat departemen.')
    } finally {
      setDeptBusy(false)
    }
  }
  const seatByUser = new Map(buildSceneViewModel(snapshot, now).members.map((m) => [m.userId, m]))

  async function handleStatusChange(task: Task, status: TaskStatus) {
    try {
      await client.updateTask(task.id, { status })
      await refresh()
      showToast('success', 'Status tugas tersimpan.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan perubahan status.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Anggota & Departemen</h1>
          <p className="text-sm text-text-muted">
            Struktur {snapshot.workspace.name}. Karakter di kantor pixel duduk sesuai divisi dan kursi yang diatur di halaman ini.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => setForm({ editUserId: null })}>
            + Tambah anggota
          </Button>
        )}
      </header>

      <section aria-label="Departemen">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Departemen ({snapshot.departments.length})</h2>
          {canManage && (
            <Button onClick={() => setDeptOpen(true)}>
              <span aria-hidden>＋</span> Tambah departemen
            </Button>
          )}
        </div>
        {snapshot.departments.length === 0 ? (
          <EmptyState title="Belum ada departemen" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.departments.map((department) => {
              const members = snapshot.memberships.filter((m) => {
                if (m.userId === department.leadUserId) return true
                return snapshot.tasks.some((t) => t.assigneeUserId === m.userId && t.departmentId === department.id)
              })
              const lead = department.leadUserId ? snapshot.profiles[department.leadUserId] : null
              const departmentPrograms = snapshot.programs.filter((p) => p.departmentId === department.id && p.status !== 'archived')
              return (
                <li key={department.id} className="rounded-[12px] border border-border-main bg-surface p-4">
                  <h3 className="font-medium">{department.name}</h3>
                  <p className="mt-0.5 text-xs text-text-muted">{department.description ?? '—'}</p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                    <Avatar name={lead?.displayName ?? '?'} /> Ketua: {lead?.displayName ?? 'belum ada'}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{members.length} anggota terkait</p>
                  {(() => {
                    const deptTasks = snapshot.tasks.filter((t) => t.departmentId === department.id)
                    const active = deptTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length
                    const late = deptTasks.filter((t) => isTaskOverdue(t, now)).length
                    const done = deptTasks.filter((t) => t.status === 'done').length
                    return (
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-muted tnum">
                        <span>Aktif: {active}</span>
                        <span className={late > 0 ? 'text-danger' : ''}>Terlambat: {late}</span>
                        <span>Selesai: {done}</span>
                      </p>
                    )
                  })()}
                  {departmentPrograms.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 border-t border-border-main pt-2 text-xs">
                      {departmentPrograms.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{p.title}</span>
                          <span className="text-text-muted tnum">{programProgress(p, snapshot.tasks).percent ?? '—'}%</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-label="Daftar anggota">
        <h2 className="mb-2 text-base font-semibold">Anggota ({snapshot.memberships.length})</h2>
        <div className="overflow-x-auto rounded-[12px] border border-border-main">
          <table className="w-full min-w-[680px] text-sm">
            <caption className="sr-only">Daftar anggota workspace beserta peran dan beban tugas</caption>
            <thead>
              <tr className="border-b border-border-main bg-surface-raised text-left text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" className="px-4 py-2 font-medium">Nama</th>
                <th scope="col" className="px-4 py-2 font-medium">Peran</th>
                <th scope="col" className="px-4 py-2 font-medium">Divisi · Kursi</th>
                <th scope="col" className="px-4 py-2 font-medium">Bergabung</th>
                <th scope="col" className="px-4 py-2 font-medium">Tugas aktif</th>
                <th scope="col" className="px-4 py-2 font-medium">Terlambat</th>
                {canManage && <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Atur</span></th>}
              </tr>
            </thead>
            <tbody>
              {snapshot.memberships.map((membership) => {
                const profile = snapshot.profiles[membership.userId]
                const myTasks = snapshot.tasks.filter((t) => t.assigneeUserId === membership.userId)
                const active = myTasks.filter((t) => t.status === 'in_progress' || t.status === 'todo' || t.status === 'blocked' || t.status === 'in_review')
                const overdue = myTasks.filter((t) => isTaskOverdue(t, now))
                return (
                  <tr key={membership.userId} className="border-b border-border-main/60 last:border-0">
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(membership.userId)}
                        className="flex items-center gap-2 rounded-[6px] text-left hover:underline"
                        aria-label={`Lihat tugas ${profile?.displayName ?? membership.userId}`}
                      >
                        <Avatar name={profile?.displayName ?? '?'} />
                        <span className="font-medium">{profile?.displayName ?? membership.userId}</span>
                        {membership.userId === session.userId && <span className="text-xs text-text-muted">(Anda)</span>}
                      </button>
                    </td>
                    <td className="px-4 py-2"><RoleBadge role={membership.role} /></td>
                    <td className="px-4 py-2 text-xs">
                      <span className="block font-medium">{seatByUser.get(membership.userId)?.departmentName ?? 'Tanpa divisi'}</span>
                      <span className="text-text-muted">
                        {seatByUser.get(membership.userId)?.seatLabel}
                        {seatByUser.get(membership.userId)?.seatPinned ? ' 📌' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-text-muted tnum">{formatDate(membership.joinedAt)}</td>
                    <td className="px-4 py-2 tnum">{active.length}</td>
                    <td className={`px-4 py-2 tnum ${overdue.length > 0 ? 'font-medium text-danger' : 'text-text-muted'}`}>
                      {overdue.length > 0 ? `${overdue.length} — perlu perhatian` : '0'}
                    </td>
                    {canManage && (
                      <td className="px-4 py-2 text-right">
                        <Button onClick={() => setForm({ editUserId: membership.userId })} aria-label={`Atur ${profile?.displayName ?? 'anggota'}`}>
                          Atur
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {canManage
            ? '📌 = kursi dikunci manual. Tambah atau atur anggota di sini; anggota baru masuk lewat pintu kantor dan duduk di kursinya.'
            : 'Hanya pemilik atau admin yang dapat menambah anggota dan mengatur kursi.'}
          {' '}Undangan via email dan kebijakan RLS belum ada di demo ini.
        </p>
      </section>

      {form && <MemberFormDialog snapshot={snapshot} editUserId={form.editUserId} onClose={() => setForm(null)} />}

      {deptOpen && (
        <AccessibleDialog
          open
          onClose={() => setDeptOpen(false)}
          title="Departemen baru"
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeptOpen(false)}>Batal</Button>
              <Button variant="primary" onClick={() => void createDepartment()} disabled={deptBusy || deptName.trim().length < 2}>
                {deptBusy ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          }
        >
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <FormField label="Nama departemen" htmlFor="dept-name" error={deptError}>
              <TextInput id="dept-name" value={deptName} onChange={(e) => setDeptName(e.target.value)} invalid={Boolean(deptError)} maxLength={80} />
            </FormField>
            <FormField label="Deskripsi (opsional)" htmlFor="dept-desc">
              <TextInput id="dept-desc" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} maxLength={120} />
            </FormField>
          </form>
        </AccessibleDialog>
      )}

      <MemberDetailPanel
        open={selectedUserId !== null}
        memberUserId={selectedUserId}
        sessionUserId={session.userId}
        snapshot={snapshot}
        onClose={() => setSelectedUserId(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
