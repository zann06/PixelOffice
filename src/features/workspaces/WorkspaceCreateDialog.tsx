import { useState } from 'react'
import { useApp } from '../../app/store'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { FormField, Select, TextInput } from '../../components/ui/Form'
import { useToast } from '../../components/ui/Toast'
import { ValidationError } from '../../types/data'

const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']

/**
 * Flow A starter: create a private workspace where the current user becomes
 * the owner. Departments and members are added afterwards (Members page).
 */
export function WorkspaceCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => Promise<void> }) {
  const { client } = useApp()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [timezone, setTimezone] = useState(TIMEZONES[0]!)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setErrors({})
    try {
      const workspace = await client.createWorkspace({ name, purpose: purpose || null, timezone })
      showToast('success', `Workspace “${workspace.name}” dibuat.`)
      await onCreated(workspace.id)
    } catch (err) {
      if (err instanceof ValidationError) setErrors({ [err.field ?? 'form']: err.message })
      else showToast('error', err instanceof Error ? err.message : 'Gagal membuat workspace.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccessibleDialog
      open
      onClose={onClose}
      title="Workspace baru"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy || name.trim().length < 3}>
            {busy ? 'Membuat…' : 'Buat workspace'}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <p className="text-xs text-text-muted">
          Workspace bersifat privat; Anda menjadi pemiliknya. Tambahkan departemen dan anggota setelahnya di halaman Anggota.
        </p>
        <FormField label="Nama workspace" htmlFor="ws-name" error={errors.name}>
          <TextInput id="ws-name" value={name} onChange={(e) => setName(e.target.value)} invalid={Boolean(errors.name)} maxLength={80} placeholder="mis. BEM Fakultas Teknik" />
        </FormField>
        <FormField label="Tujuan (opsional)" htmlFor="ws-purpose" error={errors.purpose}>
          <TextInput id="ws-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={120} placeholder="mis. Koordinasi kepengurusan 2026" />
        </FormField>
        <FormField label="Zona waktu" htmlFor="ws-tz">
          <Select id="ws-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </FormField>
        {errors.form && (
          <p role="alert" className="text-xs text-danger">
            {errors.form}
          </p>
        )}
      </form>
    </AccessibleDialog>
  )
}
