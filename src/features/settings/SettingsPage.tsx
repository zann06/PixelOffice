import { useRef, useState } from 'react'
import { PixelSelect } from '../../components/ui/PixelSelect'
import { useApp } from '../../app/store'
import { useSettings } from '../../app/settings'
import { useToast } from '../../components/ui/Toast'
import { roleForUser } from '../../lib/permissions'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PermissionDenied } from '../../components/ui/States'
import { downloadCsv, downloadJson, meetingsCsv, programsCsv, tasksCsv } from '../../lib/csv'

export function SettingsPage() {
  const { snapshot, session, client, refresh } = useApp()
  const { motionEnabled, setMotionEnabled, defaultDashboardView, setDefaultDashboardView } = useSettings()
  const { showToast } = useToast()
  const [resetOpen, setResetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!snapshot || !session?.userId) return null
  const myRole = roleForUser(snapshot.memberships, snapshot.workspace.id, session.userId)
  const canExport = myRole === 'owner' || myRole === 'admin' || myRole === 'lead'

  function exportCsv(kind: 'tasks' | 'programs' | 'meetings') {
    try {
      if (kind === 'tasks') downloadCsv('tugas.csv', tasksCsv(snapshot!, snapshot!.tasks))
      if (kind === 'programs') downloadCsv('program-kerja.csv', programsCsv(snapshot!, snapshot!.programs))
      if (kind === 'meetings') downloadCsv('rapat.csv', meetingsCsv(snapshot!.meetings))
      showToast('success', 'CSV diunduh.')
    } catch {
      showToast('error', 'Gagal membuat CSV.')
    }
  }

  async function doImport() {
    if (!pendingImport) return
    setBusy(true)
    try {
      await client.importDemoData(pendingImport)
      await refresh()
      setImportOpen(false)
      setPendingImport(null)
      showToast('success', 'Data demo berhasil diimpor.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengimpor data.')
      setImportOpen(false)
      setPendingImport(null)
    } finally {
      setBusy(false)
    }
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      setPendingImport(typeof result === 'string' ? result : '')
      setImportOpen(true)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  async function reset() {
    setBusy(true)
    try {
      await client.resetDemoData()
      await refresh()
      setResetOpen(false)
      showToast('success', 'Data demo direset ke kondisi awal.')
    } catch {
      showToast('error', 'Gagal mereset data.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-text-muted">Preferensi tampilan, ekspor data, dan data demo.</p>
      </header>

      <section aria-label="Workspace" className="rounded-[12px] border border-border-main bg-surface p-4">
        <h2 className="mb-2 text-base font-semibold">Workspace</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-text-muted">Nama</dt>
          <dd>{snapshot.workspace.name}</dd>
          <dt className="text-text-muted">Zona waktu</dt>
          <dd>{snapshot.workspace.timezone}</dd>
          <dt className="text-text-muted">Visibilitas</dt>
          <dd>Privat (default aman)</dd>
          <dt className="text-text-muted">Peran Anda</dt>
          <dd>{myRole}</dd>
        </dl>
      </section>

      <section aria-label="Tampilan" className="rounded-[12px] border border-border-main bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold">Tampilan & aksesibilitas</h2>
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Animasi kantor
              <span className="block text-xs text-text-muted">
                Menghormati preferensi sistem “reduced motion” saat pertama kali dibuka.
              </span>
            </span>
            <input
              type="checkbox"
              checked={motionEnabled}
              onChange={(e) => setMotionEnabled(e.target.checked)}
              className="h-5 w-5 accent-[#3ebc8c]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Tampilan default dasbor</span>
            <PixelSelect
              className="rounded-[8px] border border-border-main bg-surface-raised px-2 py-1.5 text-sm"
              value={defaultDashboardView}
              onChange={(e) => setDefaultDashboardView(e.target.value as 'scene' | 'list')}
            >
              <option value="scene">Tampilan kantor</option>
              <option value="list">Daftar anggota</option>
            </PixelSelect>
          </label>
        </div>
      </section>

      <section aria-label="Ekspor data" className="rounded-[12px] border border-border-main bg-surface p-4">
        <h2 className="mb-1 text-base font-semibold">Ekspor CSV</h2>
        <p className="mb-3 text-xs text-text-muted">
          Ekspor mengikuti izin peran: pemilik, admin, dan ketua divisi. Nama berkas dihasilkan lokal di browser.
        </p>
        {canExport ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportCsv('tasks')}>Ekspor tugas</Button>
            <Button onClick={() => exportCsv('programs')}>Ekspor program kerja</Button>
            <Button onClick={() => exportCsv('meetings')}>Ekspor rapat</Button>
          </div>
        ) : (
          <PermissionDenied message="Ekspor hanya untuk pemilik, admin, atau ketua divisi." />
        )}
      </section>

      <section aria-label="Data demo" className="rounded-[12px] border border-border-main bg-surface p-4">
        <h2 className="mb-1 text-base font-semibold">Data demo</h2>
        <p className="mb-3 text-xs text-text-muted">
          Dataset fiktif tersimpan di localStorage browser ini. Reset mengembalikan semua perubahan ke kondisi awal.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              try {
                const json = await client.exportDemoData()
                downloadJson('pixeloffice-demo.json', json)
                showToast('success', 'Data demo diekspor.')
              } catch {
                showToast('error', 'Gagal mengekspor data.')
              }
            }}
          >
            Ekspor data (JSON)
          </Button>
          <Button onClick={() => fileRef.current?.click()}>Impor data (JSON)</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Pilih berkas data demo"
            onChange={onPickFile}
          />
          <Button variant="danger" onClick={() => setResetOpen(true)}>
            Reset data demo
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Impor menimpa seluruh data demo — pastikan berkasnya berasal dari ekspor PixelOffice.
        </p>
      </section>

      <section aria-label="Pintasan keyboard" className="rounded-[12px] border border-border-main bg-surface p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Pintasan keyboard</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-text-muted">
          <li><kbd className="rounded-[4px] border border-border-main px-1">Ctrl K</kbd> / <kbd className="rounded-[4px] border border-border-main px-1">⌘ K</kbd> — cari cepat tugas, program, rapat, anggota</li>
          <li><kbd className="rounded-[4px] border border-border-main px-1">Esc</kbd> — menutup dialog</li>
          <li><kbd className="rounded-[4px] border border-border-main px-1">Tab</kbd> — navigasi keyboard (scene punya tombol per karakter)</li>
        </ul>
      </section>

      <section aria-label="Status implementasi" className="rounded-[12px] border border-border-main bg-surface p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Status implementasi</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-text-muted">
          <li>Terimplementasi: dasbor + metrik dari data, kantor pixel dengan data nyata, tugas, program kerja, rapat & keputusan→tugas, ekspor CSV, matriks peran di lapisan data, validasi input, uji unit.</li>
          <li>Belum diimplementasikan: Supabase Auth + RLS asli, undangan anggota, notifikasi, realtime, unggah berkas. Lihat README dan docs/IMPLEMENTATION_NOTES.md.</li>
        </ul>
      </section>

      <ConfirmDialog
        open={importOpen}
        onCancel={() => {
          setImportOpen(false)
          setPendingImport(null)
        }}
        onConfirm={() => void doImport()}
        title="Impor data demo?"
        message="Seluruh data demo saat ini akan DIGANTI dengan isi berkas yang dipilih. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Impor"
        busy={busy}
      />

      <ConfirmDialog
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => void reset()}
        title="Reset data demo?"
        message="Semua perubahan yang Anda buat pada dataset demo akan hilang dan data awal akan dibuat ulang. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Reset"
        busy={busy}
      />
    </div>
  )
}
