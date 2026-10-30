import { useState } from 'react'
import { useApp } from '../../app/store'
import { programProgress, isTaskOverdue } from '../../lib/progress'
import { RoleBadge } from '../../components/ui/StatusBadge'
import { Avatar } from '../../components/ui/Form'
import { EmptyState } from '../../components/ui/States'
import { formatDate } from '../../lib/format'
import { MemberDetailPanel } from '../pixel-office/MemberDetailPanel'
import type { Task, TaskStatus } from '../../types/data'
import { useToast } from '../../components/ui/Toast'

export function MembersPage() {
  const { snapshot, session, client, refresh } = useApp()
  const { showToast } = useToast()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  if (!snapshot || !session?.userId) return null
  const now = new Date()

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
      <header>
        <h1 className="text-xl font-semibold">Anggota & Departemen</h1>
        <p className="text-sm text-text-muted">
          Struktur {snapshot.workspace.name}. Posisi karakter di kantor pixel mengikuti divisi pada halaman ini.
        </p>
      </header>

      <section aria-label="Departemen">
        <h2 className="mb-2 text-base font-semibold">Departemen ({snapshot.departments.length})</h2>
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
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Daftar anggota workspace beserta peran dan beban tugas</caption>
            <thead>
              <tr className="border-b border-border-main bg-surface-raised text-left text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" className="px-4 py-2 font-medium">Nama</th>
                <th scope="col" className="px-4 py-2 font-medium">Peran</th>
                <th scope="col" className="px-4 py-2 font-medium">Bergabung</th>
                <th scope="col" className="px-4 py-2 font-medium">Tugas aktif</th>
                <th scope="col" className="px-4 py-2 font-medium">Terlambat</th>
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
                    <td className="px-4 py-2 text-xs text-text-muted tnum">{formatDate(membership.joinedAt)}</td>
                    <td className="px-4 py-2 tnum">{active.length}</td>
                    <td className={`px-4 py-2 tnum ${overdue.length > 0 ? 'font-medium text-danger' : 'text-text-muted'}`}>
                      {overdue.length > 0 ? `${overdue.length} — perlu perhatian` : '0'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Pengelolaan anggota (undangan, perubahan peran) belum diimplementasikan pada demo ini — diperlukan kebijakan RLS dan fungsi database yang aman.
        </p>
      </section>

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
