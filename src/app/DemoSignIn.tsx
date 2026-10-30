import { useState } from 'react'
import { useApp } from './store'
import { Avatar } from '../components/ui/Form'
import { RoleBadge } from '../components/ui/StatusBadge'
import { Button } from '../components/ui/Button'
import { LogoMark } from '../components/ui/icons'

/**
 * Demo sign-in. Production replaces this screen with Supabase Auth
 * (email/password or magic link). Picking a demo profile signs into the local
 * dataset and drives the same permission matrix the server would enforce.
 */
export function DemoSignIn() {
  const { signInAs } = useApp()
  const [busy, setBusy] = useState<string | null>(null)

  // Demo profiles are static; the seed defines them.
  const demoUsers = [
    { id: 'u-ratna', name: 'Ratna Wijaya', role: 'owner', hint: 'Pemilik workspace' },
    { id: 'u-fajar', name: 'Fajar Nugroho', role: 'lead', hint: 'Ketua divisi Teknologi' },
    { id: 'u-andi', name: 'Andi Saputra', role: 'member', hint: 'Anggota Teknologi' },
    { id: 'u-anton', name: 'Anton Prakoso', role: 'viewer', hint: 'Pengamat (hanya lihat)' },
    { id: 'u-hana', name: 'Hana Permata', role: 'owner', hint: 'Workspace kedua (uji isolasi data)' },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark size={44} />
          <h1 className="pixel-label text-xl">PixelOffice</h1>
          <p className="max-w-sm text-sm text-text-muted">
            Ruang kerja pixel-art untuk tim nyata. Kelola program kerja, tugas, dan rapat — karakter kantor mencerminkan data yang tersimpan.
          </p>
        </div>

        <div className="rounded-[12px] border border-border-main bg-surface p-4 sm:p-6">
          <h2 className="mb-1 text-base font-semibold">Masuk (mode demo)</h2>
          <p className="mb-4 text-xs text-text-muted">
            Belum ada backend Supabase yang dikonfigurasi di lingkungan ini, jadi masuk memilih profil demo lokal. Otentikasi asli akan menggantikan layar ini.
          </p>
          <ul className="flex flex-col gap-2">
            {demoUsers.map((user) => (
              <li key={user.id}>
                <Button
                  className="w-full justify-start"
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy(user.id)
                    try {
                      await signInAs(user.id)
                    } finally {
                      setBusy(null)
                    }
                  }}
                >
                  <Avatar name={user.name} />
                  <span className="flex-1 text-left">
                    <span className="block font-medium">{user.name}</span>
                    <span className="block text-xs font-normal text-text-muted">{user.hint}</span>
                  </span>
                  <RoleBadge role={user.role} />
                  {busy === user.id && <span aria-live="polite">Memproses…</span>}
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-center text-xs text-text-muted">
          Data demo disimpan lokal di browser Anda dan memakai nama fiktif.
        </p>
      </div>
    </div>
  )
}
