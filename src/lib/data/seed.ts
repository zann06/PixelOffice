import type {
  Decision,
  Department,
  Meeting,
  MeetingAttendee,
  Profile,
  Program,
  Task,
  Workspace,
  WorkspaceMember,
  ActivityEvent,
  TaskComment,
} from '../../types/data'

/**
 * Fictional demo dataset — no real people, organizations, or links
 * (docs/ROADMAP.md Phase 4: "Demo workspace uses fictional data only").
 *
 * Dates are generated relative to first-seed time so the demo always shows a
 * believable mix of overdue, today, and upcoming work.
 */

export const WORKSPACE_A = 'ws-himpunan'
export const WORKSPACE_B = 'ws-kotabersih'

const HOUR = 3600_000
const DAY = 24 * HOUR

interface SeedMember {
  userId: string
  displayName: string
  role: WorkspaceMember['role']
}

const MEMBERS_A: SeedMember[] = [
  { userId: 'u-ratna', displayName: 'Ratna Wijaya', role: 'owner' },
  { userId: 'u-bima', displayName: 'Bima Prasetyo', role: 'admin' },
  { userId: 'u-fajar', displayName: 'Fajar Nugroho', role: 'lead' },
  { userId: 'u-sinta', displayName: 'Sinta Maharani', role: 'lead' },
  { userId: 'u-dewi', displayName: 'Dewi Lestari', role: 'lead' },
  { userId: 'u-rizky', displayName: 'Rizky Ramadhan', role: 'lead' },
  { userId: 'u-laras', displayName: 'Laras Wulandari', role: 'lead' },
  { userId: 'u-andi', displayName: 'Andi Saputra', role: 'member' },
  { userId: 'u-putri', displayName: 'Putri Handayani', role: 'member' },
  { userId: 'u-bagus', displayName: 'Bagus Wicaksono', role: 'member' },
  { userId: 'u-maya', displayName: 'Maya Kusuma', role: 'member' },
  { userId: 'u-anton', displayName: 'Anton Prakoso', role: 'viewer' },
]

const MEMBERS_B: SeedMember[] = [
  { userId: 'u-hana', displayName: 'Hana Permata', role: 'owner' },
  { userId: 'u-yusuf', displayName: 'Yusuf Joko', role: 'member' },
]

export interface SeedDatabase {
  workspaces: Workspace[]
  profiles: Profile[]
  memberships: WorkspaceMember[]
  departments: Department[]
  programs: Program[]
  tasks: Task[]
  meetings: Meeting[]
  attendees: MeetingAttendee[]
  decisions: Decision[]
  activity: ActivityEvent[]
  comments: TaskComment[]
}

export function buildSeedDatabase(now: Date = new Date()): SeedDatabase {
  const iso = (ms: number) => new Date(ms).toISOString()
  const t = now.getTime()
  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(t + dayOffset * DAY)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }
  const dateOnly = (dayOffset: number) => new Date(t + dayOffset * DAY).toISOString().slice(0, 10)

  const workspaces: Workspace[] = [
    { id: WORKSPACE_A, name: 'Himpunan Mahasiswa Kreatif', slug: 'himpunan-kreatif', timezone: 'Asia/Jakarta', visibility: 'private', createdAt: iso(t - 120 * DAY) },
    { id: WORKSPACE_B, name: 'Komunitas Kota Bersih', slug: 'kota-bersih', timezone: 'Asia/Jakarta', visibility: 'private', createdAt: iso(t - 60 * DAY) },
  ]

  const profiles: Profile[] = [
    ...MEMBERS_A.map((m) => ({ id: m.userId, displayName: m.displayName })),
    ...MEMBERS_B.map((m) => ({ id: m.userId, displayName: m.displayName })),
  ]

  const memberships: WorkspaceMember[] = [
    ...MEMBERS_A.map((m) => ({ workspaceId: WORKSPACE_A, userId: m.userId, role: m.role, joinedAt: iso(t - 100 * DAY) })),
    ...MEMBERS_B.map((m) => ({ workspaceId: WORKSPACE_B, userId: m.userId, role: m.role, joinedAt: iso(t - 50 * DAY) })),
  ]

  const departments: Department[] = [
    { id: 'd-bph', workspaceId: WORKSPACE_A, name: 'BPH & Sekretariat', description: 'Ketua, sekretaris, surat-menyurat, dan arsip organisasi.', leadUserId: 'u-ratna', createdAt: iso(t - 100 * DAY) },
    { id: 'd-teknologi', workspaceId: WORKSPACE_A, name: 'Teknologi', description: 'Website, sistem internal, dan perkakas digital.', leadUserId: 'u-fajar', createdAt: iso(t - 100 * DAY) },
    { id: 'd-desain', workspaceId: WORKSPACE_A, name: 'Desain', description: 'Identitas visual, poster, dan materi publikasi.', leadUserId: 'u-sinta', createdAt: iso(t - 100 * DAY) },
    { id: 'd-acara', workspaceId: WORKSPACE_A, name: 'Acara', description: 'Perencanaan dan pelaksanaan event organisasi.', leadUserId: 'u-dewi', createdAt: iso(t - 100 * DAY) },
    { id: 'd-humas', workspaceId: WORKSPACE_A, name: 'Humas & Media', description: 'Media sosial, dokumentasi, dan komunikasi eksternal.', leadUserId: 'u-rizky', createdAt: iso(t - 100 * DAY) },
    { id: 'd-keuangan', workspaceId: WORKSPACE_A, name: 'Keuangan', description: 'Kas, laporan keuangan, dan pertanggungjawaban anggaran.', leadUserId: 'u-laras', createdAt: iso(t - 100 * DAY) },
    { id: 'd-lapangan', workspaceId: WORKSPACE_B, name: 'Tim Lapangan', description: 'Koordinasi aksi bersih-bersih.', leadUserId: 'u-hana', createdAt: iso(t - 50 * DAY) },
  ]

  const programs: Program[] = [
    {
      id: 'p-website', workspaceId: WORKSPACE_A, departmentId: 'd-teknologi',
      title: 'Website Organisasi',
      objective: 'Memiliki website profil organisasi sebelum masa penerimaan anggota baru.',
      description: 'Termasuk halaman profil, program kerja, dan formulir kontak.',
      status: 'active', ownerUserId: 'u-fajar', startDate: dateOnly(-30), dueDate: dateOnly(21),
      createdAt: iso(t - 30 * DAY), updatedAt: iso(t - 2 * DAY),
    },
    {
      id: 'p-event', workspaceId: WORKSPACE_A, departmentId: 'd-acara',
      title: 'Event Kampus 2026',
      objective: 'Menyelenggarakan festival tahunan untuk mahasiswa baru.',
      description: 'Berisi panggung hiburan, bazar UMKM, dan talkshow.',
      status: 'active', ownerUserId: 'u-dewi', startDate: dateOnly(-20), dueDate: dateOnly(35),
      createdAt: iso(t - 20 * DAY), updatedAt: iso(t - 1 * DAY),
    },
    {
      id: 'p-rebrand', workspaceId: WORKSPACE_A, departmentId: 'd-humas',
      title: 'Rebranding Media Sosial',
      objective: 'Menyamarkan identitas visual seluruh kanal media sosial.',
      description: null,
      status: 'active', ownerUserId: 'u-rizky', startDate: dateOnly(-10), dueDate: dateOnly(14),
      createdAt: iso(t - 10 * DAY), updatedAt: iso(t - 3 * DAY),
    },
    {
      id: 'p-registrasi', workspaceId: WORKSPACE_A, departmentId: 'd-teknologi',
      title: 'Sistem Registrasi Anggota',
      objective: 'Digitalisasi pendaftaran anggota baru.',
      description: null,
      status: 'planned', ownerUserId: 'u-fajar', startDate: dateOnly(25), dueDate: dateOnly(60),
      createdAt: iso(t - 5 * DAY), updatedAt: iso(t - 5 * DAY),
    },
    {
      id: 'p-laporan', workspaceId: WORKSPACE_A, departmentId: 'd-acara',
      title: 'Laporan Pertanggungjawaban',
      objective: 'Dokumen LPJ kegiatan semester lalu.',
      description: null,
      status: 'completed', ownerUserId: 'u-bima', startDate: dateOnly(-60), dueDate: dateOnly(-5),
      createdAt: iso(t - 60 * DAY), updatedAt: iso(t - 6 * DAY),
    },
    {
      id: 'p-aksi', workspaceId: WORKSPACE_B, departmentId: 'd-lapangan',
      title: 'Aksi Bersih Pantai Oktober',
      objective: 'Membersihkan pesisir bersama relawan.',
      description: null,
      status: 'active', ownerUserId: 'u-hana', startDate: dateOnly(-7), dueDate: dateOnly(10),
      createdAt: iso(t - 7 * DAY), updatedAt: iso(t - 1 * DAY),
    },
  ]

  const mkTask = (
    id: string, programId: string | null, departmentId: string,
    title: string, status: Task['status'], priority: Task['priority'],
    assigneeUserId: string | null, dueOffsetDays: number | null,
    extra?: Partial<Pick<Task, 'description' | 'blockedReason' | 'decisionId' | 'recurrence'>>,
  ): Task => ({
    id,
    workspaceId: WORKSPACE_A,
    programId,
    departmentId,
    title,
    description: extra?.description ?? null,
    status,
    priority,
    assigneeUserId,
    createdBy: 'u-fajar',
    dueAt: dueOffsetDays == null ? null : at(dueOffsetDays, 17, 0),
    recurrence: extra?.recurrence ?? null,
    blockedReason: extra?.blockedReason ?? null,
    decisionId: extra?.decisionId ?? null,
    createdAt: iso(t - 12 * DAY),
    updatedAt: iso(t - 1 * DAY),
    completedAt: status === 'done' ? iso(t - 1 * DAY) : null,
  })

  const tasks: Task[] = [
    // Website Organisasi
    mkTask('t-web-1', 'p-website', 'd-teknologi', 'Riset referensi website organisasi', 'done', 'normal', 'u-andi', -8),
    mkTask('t-web-2', 'p-website', 'd-teknologi', 'Buat desain halaman utama', 'done', 'high', 'u-putri', -4),
    mkTask('t-web-3', 'p-website', 'd-teknologi', 'Implementasi halaman utama', 'in_progress', 'high', 'u-andi', 3, { description: 'Prioritaskan hero section dan daftar program kerja.' }),
    mkTask('t-web-4', 'p-website', 'd-teknologi', 'Implementasi halaman program kerja', 'todo', 'normal', 'u-fajar', 9),
    mkTask('t-web-5', 'p-website', 'd-desain', 'Kumpulkan foto kegiatan untuk galeri', 'in_progress', 'normal', 'u-putri', 5),
    mkTask('t-web-6', 'p-website', 'd-teknologi', 'Setup domain dan hosting', 'blocked', 'high', 'u-andi', 6, { blockedReason: 'Menunggu akses akun domain dari pengurus sebelumnya.' }),
    // Event Kampus 2026
    mkTask('t-ev-1', 'p-event', 'd-acara', 'Ajukan izin venue ke kampus', 'in_review', 'high', 'u-bagus', 1, { description: 'Proposal sudah diserahkan, menunggu balasan bagian kemahasiswaan.' }),
    mkTask('t-ev-2', 'p-event', 'd-acara', 'Rekrutmen relawan panitia', 'in_progress', 'normal', 'u-dewi', 7),
    mkTask('t-ev-3', 'p-event', 'd-acara', 'Konfirmasi penampil hiburan', 'blocked', 'high', 'u-bagus', 4, { blockedReason: 'Dua penampil belum membalas konfirmasi jadwal.' }),
    mkTask('t-ev-4', 'p-event', 'd-desain', 'Desain poster utama event', 'in_progress', 'high', 'u-sinta', 2),
    mkTask('t-ev-5', 'p-event', 'd-acara', 'Susun run down acara', 'done', 'normal', 'u-dewi', -2),
    mkTask('t-ev-6', 'p-event', 'd-humas', 'Konten pengumuman event', 'todo', 'normal', 'u-maya', 8),
    // Rebranding Media Sosial
    mkTask('t-rb-1', 'p-rebrand', 'd-humas', 'Audit konten kanal lama', 'done', 'normal', 'u-maya', -3),
    mkTask('t-rb-2', 'p-rebrand', 'd-desain', 'Buat template feed baru', 'in_progress', 'normal', 'u-putri', 4),
    mkTask('t-rb-3', 'p-rebrand', 'd-humas', 'Migrasi akun dan bio baru', 'todo', 'low', 'u-rizky', 10),
    mkTask('t-rb-4', 'p-rebrand', 'd-desain', 'Revisi logo versi flat', 'in_review', 'normal', 'u-sinta', 6),
    // Sistem Registrasi Anggota (planned)
    mkTask('t-rg-1', 'p-registrasi', 'd-teknologi', 'Tulis kebutuhan fitur registrasi', 'todo', 'normal', 'u-fajar', 28),
    mkTask('t-rg-2', 'p-registrasi', 'd-teknologi', 'Riset opsi formulir online', 'todo', 'low', 'u-andi', 30),
    // Laporan Pertanggungjawaban (completed)
    mkTask('t-lp-1', 'p-laporan', 'd-acara', 'Kumpulkan dokumentasi kegiatan', 'done', 'normal', 'u-bagus', -20),
    mkTask('t-lp-2', 'p-laporan', 'd-acara', 'Rekap anggaran terpakai', 'done', 'normal', 'u-bima', -18),
    mkTask('t-lp-3', 'p-laporan', 'd-acara', 'Finalisasi dokumen LPJ', 'done', 'high', 'u-bima', -6),
    mkTask('t-lp-4', 'p-laporan', 'd-acara', 'Cetak proposal sponsor tambahan', 'cancelled', 'low', 'u-bagus', -15),
    // Task without a program (general)
    mkTask('t-gl-1', null, 'd-humas', 'Simpan arsip foto ke drive bersama', 'todo', 'low', 'u-maya', null),
    // Overdue demo tasks
    mkTask('t-gl-2', null, 'd-humas', 'Balas pesan masuk akun media sosial', 'todo', 'normal', 'u-maya', -2, { recurrence: 'weekly' }),
    mkTask('t-gl-3', null, 'd-teknologi', 'Perbarui daftar kontak alumni', 'blocked', 'low', 'u-andi', -3, { blockedReason: 'Spreadsheet kontak lama tidak bisa diakses.' }),
    // Keuangan (Bendahara)
    mkTask('t-ku-1', null, 'd-keuangan', 'Rekap kas bulanan Oktober', 'in_progress', 'high', 'u-laras', 3, { description: 'Cocokkan nota panitia dengan buku kas.' }),
    mkTask('t-ku-2', null, 'd-keuangan', 'Susun laporan keuangan event', 'todo', 'normal', 'u-laras', 12),
    mkTask('t-ku-3', null, 'd-keuangan', 'Arsip kwitansi panitia', 'done', 'low', 'u-laras', -4),
    // Sekretariat (BPH)
    mkTask('t-sk-1', null, 'd-bph', 'Balas surat izin kegiatan', 'in_progress', 'normal', 'u-bima', 2),
    mkTask('t-sk-2', null, 'd-bph', 'Rapikan arsip notulen rapat', 'todo', 'low', 'u-bima', 9),
  ]

  // Workspace B tasks (isolation demo)
  tasks.push(
    {
      id: 't-b-1', workspaceId: WORKSPACE_B, programId: 'p-aksi', departmentId: 'd-lapangan',
      title: 'Koordinasi relawan mingguan', description: null, status: 'in_progress', priority: 'normal', recurrence: 'weekly' as const,
      assigneeUserId: 'u-hana', createdBy: 'u-hana', dueAt: at(2, 17, 0), blockedReason: null, decisionId: null,
      createdAt: iso(t - 5 * DAY), updatedAt: iso(t - 1 * DAY), completedAt: null,
    },
  )

  const meetings: Meeting[] = [
    {
      id: 'm-perencanaan', workspaceId: WORKSPACE_A, departmentId: null,
      title: 'Rapat Perencanaan Event',
      startsAt: at(-7, 14, 0), endsAt: at(-7, 15, 30),
      meetingUrl: null,
      agenda: '1. Evaluasi proposal event\n2. Pembagian divisi\n3. Anggaran',
      notes: 'Venue dikonfirmasi oleh bagian kemahasiswaan. Panitia inti 8 orang.',
      createdBy: 'u-dewi', createdAt: iso(t - 9 * DAY), updatedAt: iso(t - 7 * DAY),
    },
    {
      id: 'm-koordinasi', workspaceId: WORKSPACE_A, departmentId: null,
      title: 'Rapat Koordinasi Mingguan',
      // Live window around seed time so the scene legitimately shows the
      // meeting room in use right after first run (data-driven, not faked).
      startsAt: iso(t - 30 * 60_000), endsAt: iso(t + 90 * 60_000),
      meetingUrl: 'https://meet.example.com/koordinasi-mingguan',
      agenda: '1. progres tiap divisi\n2. kendala\n3. rencana pekan depan',
      notes: null,
      createdBy: 'u-ratna', createdAt: iso(t - 3 * DAY), updatedAt: iso(t - 3 * DAY),
    },
    {
      id: 'm-review', workspaceId: WORKSPACE_A, departmentId: 'd-desain',
      title: 'Review Desain Poster',
      startsAt: at(1, 10, 0), endsAt: at(1, 11, 0),
      meetingUrl: null,
      agenda: 'Review 3 alternatif poster utama.',
      notes: null,
      createdBy: 'u-sinta', createdAt: iso(t - 2 * DAY), updatedAt: iso(t - 2 * DAY),
    },
    {
      id: 'm-b', workspaceId: WORKSPACE_B, departmentId: 'd-lapangan',
      title: 'Briefing Relawan', startsAt: at(2, 9, 0), endsAt: at(2, 10, 0),
      meetingUrl: null, agenda: 'Pembagian zona pantai.', notes: null,
      createdBy: 'u-hana', createdAt: iso(t - 2 * DAY), updatedAt: iso(t - 2 * DAY),
    },
  ]

  const attendees: MeetingAttendee[] = [
    { meetingId: 'm-perencanaan', userId: 'u-ratna', attendanceStatus: 'attended' },
    { meetingId: 'm-perencanaan', userId: 'u-dewi', attendanceStatus: 'attended' },
    { meetingId: 'm-perencanaan', userId: 'u-bagus', attendanceStatus: 'attended' },
    { meetingId: 'm-perencanaan', userId: 'u-maya', attendanceStatus: 'attended' },
    { meetingId: 'm-koordinasi', userId: 'u-ratna', attendanceStatus: 'going' },
    { meetingId: 'm-koordinasi', userId: 'u-bima', attendanceStatus: 'going' },
    { meetingId: 'm-koordinasi', userId: 'u-fajar', attendanceStatus: 'going' },
    { meetingId: 'm-koordinasi', userId: 'u-sinta', attendanceStatus: 'going' },
    { meetingId: 'm-koordinasi', userId: 'u-dewi', attendanceStatus: 'going' },
    { meetingId: 'm-koordinasi', userId: 'u-rizky', attendanceStatus: 'going' },
    { meetingId: 'm-review', userId: 'u-sinta', attendanceStatus: 'invited' },
    { meetingId: 'm-review', userId: 'u-putri', attendanceStatus: 'invited' },
    { meetingId: 'm-review', userId: 'u-maya', attendanceStatus: 'invited' },
    { meetingId: 'm-b', userId: 'u-hana', attendanceStatus: 'invited' },
  ]

  const decisions: Decision[] = [
    {
      id: 'dc-tema', meetingId: 'm-perencanaan', workspaceId: WORKSPACE_A,
      summary: 'Tema event ditetapkan: "Pixel Kreatif Fest".',
      createdBy: 'u-dewi', createdAt: iso(t - 7 * DAY),
    },
    {
      id: 'dc-anggaran', meetingId: 'm-perencanaan', workspaceId: WORKSPACE_A,
      summary: 'Anggaran konsumsi panitia dipangkas 10% dan dialihkan ke dekorasi panggung.',
      createdBy: 'u-ratna', createdAt: iso(t - 7 * DAY),
    },
  ]

  // Decision dc-tema already became a task (linked via decisionId) —
  // demonstrating the meeting→task flow without duplicating the decision.
  tasks.push(
    mkTask('t-ev-decision', 'p-event', 'd-desain', 'Terapkan tema "Pixel Kreatif Fest" pada dekorasi', 'in_progress', 'normal', 'u-putri', 12, { decisionId: 'dc-tema' }),
  )

  const activity: ActivityEvent[] = [
    { id: 'a-1', workspaceId: WORKSPACE_A, actorUserId: 'u-andi', entityType: 'task', entityId: 't-web-3', action: 'task.status_changed', metadata: { from: 'todo', to: 'in_progress', taskTitle: 'Implementasi halaman utama' }, createdAt: iso(t - 2 * DAY) },
    { id: 'a-2', workspaceId: WORKSPACE_A, actorUserId: 'u-bima', entityType: 'program', entityId: 'p-laporan', action: 'program.completed', metadata: { programTitle: 'Laporan Pertanggungjawaban' }, createdAt: iso(t - 6 * DAY) },
    { id: 'a-3', workspaceId: WORKSPACE_A, actorUserId: 'u-dewi', entityType: 'decision', entityId: 'dc-tema', action: 'decision.task_created', metadata: { decisionSummary: 'Tema event ditetapkan: "Pixel Kreatif Fest".', taskTitle: 'Terapkan tema "Pixel Kreatif Fest" pada dekorasi' }, createdAt: iso(t - 6 * DAY) },
  ]

  const comments: TaskComment[] = [
    { id: 'c-1', workspaceId: WORKSPACE_A, taskId: 't-web-3', authorUserId: 'u-fajar', body: 'Hero section dulu ya, daftar program kerja menyusul.', createdAt: iso(t - 2 * DAY) },
    { id: 'c-2', workspaceId: WORKSPACE_A, taskId: 't-web-3', authorUserId: 'u-andi', body: 'Siap, komponen daftar program sudah saya siapkan datanya.', createdAt: iso(t - 1 * DAY) },
    { id: 'c-3', workspaceId: WORKSPACE_A, taskId: 't-ev-3', authorUserId: 'u-dewi', body: 'Saya bantu follow up penampil lewat kakak tingkatnya.', createdAt: iso(t - 1 * DAY) },
    { id: 'c-4', workspaceId: WORKSPACE_A, taskId: 't-ku-1', authorUserId: 'u-ratna', body: 'Nota dekorasi bulan lalu jangan lupa dicocokkan juga.', createdAt: iso(t - 12 * HOUR) },
  ]

  return { workspaces, profiles, memberships, departments, programs, tasks, meetings, attendees, decisions, activity, comments }
}
