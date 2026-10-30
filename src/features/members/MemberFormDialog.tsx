import { useMemo, useState } from 'react'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { FormField, Select, TextInput } from '../../components/ui/Form'
import { useToast } from '../../components/ui/Toast'
import { useApp } from '../../app/store'
import { ValidationError, type AssignableRole, type WorkspaceSnapshot } from '../../types/data'
import { buildSceneViewModel } from '../pixel-office/sceneViewModel'
import { SEAT_ROOMS, defaultRoomForDepartment, findSeat, makeSeatId } from '../pixel-office/seatCatalog'

const ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: 'member', label: 'Anggota' },
  { value: 'lead', label: 'Ketua divisi' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Pengamat (lihat saja)' },
]

interface Props {
  snapshot: WorkspaceSnapshot
  /** null = add a new member; otherwise edit this member's role / division / seat. */
  editUserId: string | null
  onClose: () => void
}

/**
 * Add a member or change where they belong and sit. A new member walks in
 * through the office door and sits at the chosen chair; with "Otomatis" they
 * take the first free chair of their division's room.
 */
export function MemberFormDialog({ snapshot, editUserId, onClose }: Props) {
  const { client, refresh } = useApp()
  const { showToast } = useToast()
  const existing = editUserId ? snapshot.memberships.find((m) => m.userId === editUserId) ?? null : null
  const editing = existing !== null

  const [name, setName] = useState(existing ? snapshot.profiles[existing.userId]?.displayName ?? '' : '')
  const [role, setRole] = useState<AssignableRole>((existing && existing.role !== 'owner' ? existing.role : 'member'))
  const [departmentId, setDepartmentId] = useState(existing?.departmentId ?? '')
  const initialSeat = findSeat(existing ? existing.seatId : undefined)
  const [roomKey, setRoomKey] = useState(initialSeat?.room.key ?? 'auto')
  const [seatId, setSeatId] = useState(initialSeat?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isOwnerRow = existing?.role === 'owner'
  // who currently sits where (home seats, from the same logic the scene uses)
  const occupancy = useMemo(() => {
    const vm = buildSceneViewModel(snapshot, new Date())
    return new Map(vm.members.map((m) => [m.seatId, m]))
  }, [snapshot])

  const room = SEAT_ROOMS.find((r) => r.key === roomKey) ?? null
  const deptName = snapshot.departments.find((d) => d.id === departmentId)?.name ?? null
  const autoRoom = defaultRoomForDepartment(deptName)

  async function submit() {
    const next: Record<string, string> = {}
    if (!editing && name.trim().length < 2) next.displayName = 'Nama minimal 2 karakter.'
    if (roomKey !== 'auto' && !seatId) next.seatId = 'Pilih kursinya.'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    try {
      const chosenSeat = roomKey === 'auto' ? null : seatId
      if (editing && existing) {
        await client.updateMember(snapshot.workspace.id, existing.userId, {
          ...(isOwnerRow ? {} : { role }),
          departmentId: departmentId || null,
          seatId: chosenSeat,
        })
        showToast('success', 'Perubahan anggota tersimpan.')
      } else {
        await client.addMember({
          workspaceId: snapshot.workspace.id,
          displayName: name,
          role,
          departmentId: departmentId || null,
          seatId: chosenSeat,
        })
        showToast('success', `${name.trim()} ditambahkan — lihat dia masuk lewat pintu di Kantor.`)
      }
      await refresh()
      onClose()
    } catch (err) {
      if (err instanceof ValidationError && err.field) setErrors({ [err.field]: err.message })
      else showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan anggota.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccessibleDialog
      open
      onClose={onClose}
      title={editing ? 'Atur anggota & kursi' : 'Tambah anggota'}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Menyimpan…' : editing ? 'Simpan' : 'Tambahkan'}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={(e) => (e.preventDefault(), void submit())}>
        <FormField label="Nama" htmlFor="member-name" error={errors.displayName}>
          <TextInput
            id="member-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={Boolean(errors.displayName)}
            maxLength={80}
            disabled={editing}
            autoComplete="off"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Peran" htmlFor="member-role" error={errors.role}>
            <Select id="member-role" value={isOwnerRow ? 'owner' : role} disabled={isOwnerRow} onChange={(e) => setRole(e.target.value as AssignableRole)}>
              {isOwnerRow && <option value="owner">Pemilik</option>}
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Divisi / tempat" htmlFor="member-dept" error={errors.departmentId} hint="Menentukan warna baju & ruangan otomatis.">
            <Select id="member-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Tanpa divisi (Aula)</option>
              {snapshot.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ruang duduk" htmlFor="member-room">
            <Select
              id="member-room"
              value={roomKey}
              onChange={(e) => {
                setRoomKey(e.target.value)
                setSeatId('')
              }}
            >
              <option value="auto">Otomatis (ikut divisi)</option>
              {SEAT_ROOMS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Kursi" htmlFor="member-seat" error={errors.seatId}>
            <Select id="member-seat" value={seatId} disabled={!room} onChange={(e) => setSeatId(e.target.value)}>
              <option value="">{room ? 'Pilih kursi…' : '—'}</option>
              {room?.seats.map((_, i) => {
                const id = makeSeatId(room.key, i)
                const holder = occupancy.get(id)
                const taken = holder !== undefined && holder.userId !== editUserId
                return (
                  <option key={id} value={id} disabled={taken}>
                    {`Kursi ${i + 1}${taken ? ` — dipakai ${holder.displayName}` : ''}`}
                  </option>
                )
              })}
            </Select>
          </FormField>
        </div>
        <p className="border-2 border-dashed border-border-main bg-surface-raised px-3 py-2 text-xs text-text-muted">
          {roomKey === 'auto'
            ? `Otomatis: duduk di ${autoRoom.label} (kursi kosong pertama; pindah ke ruang lain jika penuh).`
            : seatId
              ? `Duduk di ${findSeat(seatId)?.label ?? ''}. Anggota baru masuk lewat pintu lalu jalan ke kursi ini.`
              : 'Pilih kursi untuk mengunci tempat duduknya.'}
        </p>
        <p className="text-[11px] text-text-muted">
          Demo lokal: perubahan tersimpan di browser ini. Di produksi, pengelolaan anggota harus dijaga kebijakan RLS.
        </p>
        <button type="submit" className="sr-only" tabIndex={-1}>
          Simpan
        </button>
      </form>
    </AccessibleDialog>
  )
}
