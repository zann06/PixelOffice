import { useEffect, useMemo, useState } from 'react'
import { PixelSelect } from '../../components/ui/PixelSelect'
import { useApp } from '../../app/store'
import { useSettings } from '../../app/settings'
import { buildSceneViewModel } from '../pixel-office/sceneViewModel'
import { PixelOfficeScene } from '../pixel-office/PixelOfficeScene'
import { MemberRoster, SceneLegend } from '../pixel-office/MemberRoster'
import { MemberDetailPanel } from '../pixel-office/MemberDetailPanel'
import { programProgress, workspaceTaskCompletion, isTaskOverdue } from '../../lib/progress'
import { formatDate, formatDueLabel, formatDateTime, formatRelative, formatTime } from '../../lib/format'
import { ProgramStatusBadge } from '../../components/ui/StatusBadge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import type { Task, TaskStatus, WorkspaceSnapshot } from '../../types/data'
import { Link } from '../../app/routing'
import { useRouter } from '../../app/router'
import { phaseForHour, isWorkingHours, fractionalHour, phaseHint, PHASE_HOUR, type DayPhase } from '../pixel-office/dayCycle'
import { useToast } from '../../components/ui/Toast'
import {
  IconClock,
  IconCollapse,
  IconExpand,
  IconGrid,
  IconList,
  IconMeeting,
  IconMoon,
  IconPause,
  IconPlay,
  IconSun,
  IconUsers,
} from '../../components/ui/icons'

const PHASE_LABEL: Record<DayPhase, string> = {
  pagi: 'Pagi',
  siang: 'Siang',
  sore: 'Sore',
  malam: 'Malam',
}

/**
 * Dashboard — every metric is computed from the saved snapshot
 * (docs/PRD.md: "All displayed progress is derived from saved data and has a
 * documented calculation"; progress rule lives in src/lib/progress.ts).
 */
export function DashboardPage() {
  const { snapshot, session, client, refresh, lastUpdatedAt } = useApp()
  const { motionEnabled, setMotionEnabled, defaultDashboardView, setDefaultDashboardView } = useSettings()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [view, setView] = useState<'scene' | 'list'>(defaultDashboardView)
  const [expanded, setExpanded] = useState(false)
  const { showToast } = useToast()
  const [, navigate] = useRouter()
  /** null = follow the real clock; otherwise a previewed hour (0–24). */
  const [simHour, setSimHour] = useState<number | null>(null)
  const [clockTick, setClockTick] = useState(0)
  const [showHint, setShowHint] = useState(() => {
    try {
      return localStorage.getItem('pixeloffice.hint.dismissed') !== '1'
    } catch {
      return true
    }
  })

  // Keep the real-clock ambience and office-hours presence fresh.
  useEffect(() => {
    const id = window.setInterval(() => setClockTick((t) => t + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const now = useMemo(() => new Date(), [snapshot?.fetchedAt, clockTick])
  const hourNow = fractionalHour(now)
  const shownHour = simHour ?? hourNow
  const phase: DayPhase = phaseForHour(Math.floor(shownHour) % 24)
  const shownClock = `${String(Math.floor(shownHour) % 24).padStart(2, '0')}.${String(Math.floor((shownHour % 1) * 60)).padStart(2, '0')}`
  // Presence honesty: characters only during working hours (docs/PRD.md §10).
  const present = isWorkingHours(now)
  const vm = useMemo(() => (snapshot ? buildSceneViewModel(snapshot, now) : null), [snapshot, now])

  if (!snapshot || !session?.userId || !vm) return null

  const nowDate = now
  const activePrograms = snapshot.programs.filter((p) => p.status === 'active')
  const overdueTasks = snapshot.tasks.filter((t) => isTaskOverdue(t, nowDate))
  const blockedTasks = snapshot.tasks.filter((t) => t.status === 'blocked')
  const upcomingMeetings = snapshot.meetings
    .filter((m) => new Date(m.startsAt).getTime() >= nowDate.getTime() || (m.endsAt && new Date(m.endsAt).getTime() > nowDate.getTime()))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const liveMeetings = upcomingMeetings.filter((m) => new Date(m.startsAt).getTime() <= nowDate.getTime())
  const completion = workspaceTaskCompletion(snapshot.tasks)
  const upcomingDeadlines = snapshot.tasks
    .filter((t) => t.dueAt && t.status !== 'done' && t.status !== 'cancelled')
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''))
    .slice(0, 5)
  const archivedPrograms = snapshot.programs.filter((p) => p.status !== 'archived').length
  const workingMembers = vm.members.filter((m) => m.activity === 'working').length
  const blockedMembers = vm.members.filter((m) => m.activity === 'blocked').length

  async function handleStatusChange(task: Task, status: TaskStatus) {
    try {
      await client.updateTask(task.id, { status })
      await refresh()
      showToast('success', 'Status tugas tersimpan.')
    } catch (err) {
      // Adapter already validated; surface the failure without losing state.
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan perubahan status.')
    }
  }

  const PhaseIcon = phase === 'malam' ? IconMoon : IconSun

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="pixel-label text-[10px] text-text-muted">Ringkasan workspace</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Dasbor</h1>
          <p className="text-sm text-text-muted">
            Ringkasan kerja {snapshot.workspace.name}. Semua angka dihitung dari data tersimpan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span className="rounded-full border border-border-main bg-surface px-2.5 py-1 tnum">
            {formatDate(nowDate)} · {formatTime(nowDate)}
          </span>
          <span className="rounded-full border border-border-main bg-surface px-2.5 py-1">
            Diperbarui {lastUpdatedAt ? formatRelative(lastUpdatedAt) : '—'}
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-border-main bg-surface px-2.5 py-1 font-medium text-text-main transition-colors hover:border-primary/40 hover:bg-surface-raised"
          >
            Muat ulang
          </button>
        </div>
      </header>

      {/* Due-soon reminder (real due dates, honest grouping) */}
      <DueSoonBanner tasks={snapshot.tasks} now={nowDate} />

      {/* Metrics */}
      <section aria-label="Metrik ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Program berjalan"
          value={activePrograms.length}
          tone="primary"
          icon={<IconPlay />}
          hint={`dari ${archivedPrograms} program`}
        />
        <MetricCard
          label="Tugas terlambat"
          value={overdueTasks.length}
          tone={overdueTasks.length > 0 ? 'danger' : 'muted'}
          icon={<IconClock />}
          hint={overdueTasks.length > 0 ? 'perlu ditindaklanjuti' : 'tidak ada'}
        />
        <MetricCard
          label="Tugas terhambat"
          value={blockedTasks.length}
          tone={blockedTasks.length > 0 ? 'warning' : 'muted'}
          icon={<IconPause />}
          hint={blockedMembers > 0 ? `${blockedMembers} anggota terkait` : 'tidak ada penghambat'}
        />
        <MetricCard
          label="Rapat aktif / mendatang"
          value={`${liveMeetings.length}/${upcomingMeetings.length}`}
          tone="info"
          icon={<IconMeeting />}
          hint={`${liveMeetings.length} berlangsung`}
        />
      </section>

      {/* Pixel office */}
      <section
        aria-label="Kantor pixel"
        className="scene-panel overflow-hidden rounded-[16px] border border-border-main shadow-[0_1px_0_rgba(255,255,255,0.7),0_18px_40px_rgba(38,49,75,0.06)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main/70 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="pixel-corners grid h-10 w-10 shrink-0 place-items-center rounded-[9px] bg-[#26314b] text-[#75e0b3]"
            >
              <IconUsers width={20} height={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight">Kantor Tim</h2>
              <p className="truncate text-xs text-text-muted">
                {present ? `${vm.members.length} anggota · ${workingMembers} sedang mengerjakan tugas` : 'Di luar jam kerja — kantor kosong'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-main bg-surface-raised px-2.5 py-1 text-text-muted">
              <PhaseIcon width={12} height={12} aria-hidden />
              <span className="font-medium text-text-main">{PHASE_LABEL[phase]}</span>
              <span className="tnum">{simHour === null ? formatTime(nowDate) : `${shownClock} (pratinjau)`}</span>
              <span className="hidden text-text-muted lg:inline">· {phaseHint(phase)}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                present ? 'border-success/40 bg-success/10 text-success' : 'border-border-main bg-surface text-text-muted'
              }`}
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${present ? 'live-dot bg-success' : 'bg-text-muted/60'}`} />
              {present ? 'Tim di kantor' : 'Di luar jam kerja'}
            </span>

            <div className="flex rounded-[8px] border border-border-main bg-surface p-0.5" role="group" aria-label="Mode tampilan kantor">
              <button
                type="button"
                aria-pressed={view === 'scene'}
                onClick={() => {
                  setView('scene')
                  setDefaultDashboardView('scene')
                }}
                className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-1 transition-colors ${
                  view === 'scene' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <IconGrid width={12} height={12} aria-hidden />
                <span className="hidden sm:inline">Kantor</span>
              </button>
              <button
                type="button"
                aria-pressed={view === 'list'}
                onClick={() => {
                  setView('list')
                  setDefaultDashboardView('list')
                }}
                className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-1 transition-colors ${
                  view === 'list' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <IconList width={12} height={12} aria-hidden />
                <span className="hidden sm:inline">Daftar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-pressed={expanded}
              aria-label={expanded ? 'Perkecil tampilan kantor' : 'Perbesar tampilan kantor'}
              title={expanded ? 'Perkecil tampilan kantor' : 'Perbesar tampilan kantor'}
              className="inline-flex items-center gap-1 rounded-[8px] border border-border-main bg-surface px-2 py-1 text-text-muted transition-colors hover:text-text-main"
            >
              {expanded ? <IconCollapse width={12} height={12} aria-hidden /> : <IconExpand width={12} height={12} aria-hidden />}
              <span className="hidden sm:inline">{expanded ? 'Perkecil' : 'Perbesar'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMotionEnabled(!motionEnabled)}
              aria-pressed={motionEnabled}
              className="inline-flex items-center gap-1 rounded-[8px] border border-border-main bg-surface px-2 py-1 text-text-muted transition-colors hover:text-text-main"
            >
              {motionEnabled ? <IconPause width={12} height={12} aria-hidden /> : <IconPlay width={12} height={12} aria-hidden />}
              <span>{motionEnabled ? 'Animasi' : 'Diam'}</span>
            </button>

            <label className="flex items-center gap-1 text-text-muted">
              <span className="sr-only">Suasana scene</span>
              <PixelSelect
                value={simHour === null ? 'auto' : phase}
                onChange={(e) => {
                  const v = e.target.value
                  setSimHour(v === 'auto' ? null : PHASE_HOUR[v as DayPhase])
                }}
                className="rounded-[8px] border border-border-main bg-surface px-2 py-1 text-text-muted hover:text-text-main"
                aria-label="Suasana scene (pratinjau pencahayaan)"
              >
                <option value="auto">Jam asli (live)</option>
                <option value="pagi">Pratinjau: Pagi</option>
                <option value="siang">Pratinjau: Siang</option>
                <option value="sore">Pratinjau: Sore</option>
                <option value="malam">Pratinjau: Malam</option>
              </PixelSelect>
            </label>

            <label className="flex items-center gap-2 text-text-muted">
              <span className="pixel-label text-[9px]">Jam {shownClock}</span>
              <input
                type="range"
                min={0}
                max={23.75}
                step={0.25}
                value={shownHour}
                onChange={(e) => setSimHour(Number(e.target.value))}
                aria-label="Geser jam untuk pratinjau pencahayaan scene"
                aria-valuetext={`${shownClock}, ${PHASE_LABEL[phase]}`}
                className="pixel-range w-28 sm:w-40"
              />
              {simHour !== null && (
                <button
                  type="button"
                  onClick={() => setSimHour(null)}
                  className="rounded-[8px] border border-border-main bg-surface px-2 py-1 font-medium text-text-main hover:bg-surface-raised"
                >
                  Live
                </button>
              )}
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-3 sm:p-4">
          {showHint && (
            <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-info/30 bg-info/5 px-3 py-2 text-xs text-info">
              <span>
                💡 Klik karakter atau ruangan untuk detail. <kbd className="rounded-[4px] border border-border-main bg-surface px-1 text-[10px]">Ctrl K</kbd> mencari cepat.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowHint(false)
                  try {
                    localStorage.setItem('pixeloffice.hint.dismissed', '1')
                  } catch {
                    // ignore
                  }
                }}
                className="ml-auto rounded-[6px] border border-info/40 px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-info/10"
              >
                Mengerti
              </button>
            </div>
          )}

          <div className={view === 'scene' && !expanded ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]' : 'grid gap-4'}>
            {view === 'scene' ? (
              <div key="scene" className="fade-up min-w-0">
                <PixelOfficeScene
                  vm={vm}
                  selectedUserId={selectedUserId}
                  onSelectMember={setSelectedUserId}
                  motionEnabled={motionEnabled}
                  phase={phase}
                  simHour={simHour}
                  present={present}
                  onNavigate={navigate}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-0.5 text-[11px] text-text-muted">
                  <span>Klik karakter untuk membuka tugas tersimpan · karakter hanya tampil pada jam kerja.</span>
                  <span className="tnum">
                    {vm.members.length} anggota · {liveMeetings.length} rapat berlangsung · {blockedMembers} terhambat
                  </span>
                </div>
              </div>
            ) : (
              <div key="list" className="fade-up min-w-0 rounded-[12px] border border-border-main bg-surface">
                <div className="flex items-center justify-between border-b border-border-main px-3 py-2">
                  <h3 className="pixel-label text-[10px] text-text-muted">Daftar anggota</h3>
                  <span className="text-xs text-text-muted tnum">{vm.members.length} orang</span>
                </div>
                <div className="scroll-slim max-h-[560px] overflow-y-auto p-2">
                  <MemberRoster members={vm.members} selectedUserId={selectedUserId} onSelectMember={setSelectedUserId} />
                </div>
              </div>
            )}

            {view === 'scene' && !expanded && (
              <div key="roster" className="fade-up hidden min-w-0 xl:block">
                <div className="rounded-[12px] border border-border-main bg-surface">
                  <div className="flex items-center justify-between border-b border-border-main px-3 py-2">
                    <h3 className="pixel-label text-[10px] text-text-muted">Anggota</h3>
                    <span className="text-[11px] text-text-muted tnum">
                      {workingMembers} aktif · {blockedMembers} terhambat
                    </span>
                  </div>
                  <div className="relative">
                    <div className="scroll-slim max-h-[470px] overflow-y-auto p-2">
                      <MemberRoster members={vm.members} selectedUserId={selectedUserId} onSelectMember={setSelectedUserId} />
                    </div>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-b-[12px] bg-gradient-to-t from-surface to-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {vm.liveMeetings.length > 0 && (
            <p
              className="flex flex-wrap items-center gap-2 rounded-[10px] border border-primary-strong/30 bg-primary/5 px-3 py-2 text-sm text-primary"
              role="status"
            >
              <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-danger" />
              <span className="font-medium">
                {`Rapat berlangsung: ${vm.liveMeetings.map((m) => m.title).join(', ')} — peserta terlihat di Ruang Meeting.`}
              </span>
            </p>
          )}

          <SceneLegend />
        </div>
      </section>

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Program aktif" className="card-lift rounded-[12px] border border-border-main bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Program aktif</h2>
            <Link to="program" className="text-xs font-medium text-info underline underline-offset-2">
              Lihat semua
            </Link>
          </div>
          {activePrograms.length === 0 ? (
            <p className="text-sm text-text-muted">Belum ada program berjalan.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activePrograms.slice(0, 4).map((program) => (
                <li key={program.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{program.title}</span>
                    <ProgramStatusBadge status={program.status} />
                  </div>
                  <ProgressBar progress={programProgress(program, snapshot.tasks)} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Tenggat terdekat" className="card-lift rounded-[12px] border border-border-main bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Tenggat terdekat</h2>
            <Link to="tugas" className="text-xs font-medium text-info underline underline-offset-2">
              Lihat semua
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-text-muted">Tidak ada tenggat mendatang.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcomingDeadlines.map((task) => {
                const overdue = isTaskOverdue(task, nowDate)
                const assignee = task.assigneeUserId ? snapshot.profiles[task.assigneeUserId]?.displayName : null
                return (
                  <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {task.title}
                      <span className="text-text-muted"> · {assignee ?? 'Belum ditugaskan'}</span>
                    </span>
                    <span className={`whitespace-nowrap text-xs font-medium tnum ${overdue ? 'text-danger' : 'text-text-muted'}`}>
                      {formatDueLabel(task.dueAt, nowDate)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-label="Rapat mendatang" className="card-lift rounded-[12px] border border-border-main bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Rapat</h2>
            <Link to="rapat" className="text-xs font-medium text-info underline underline-offset-2">
              Lihat semua
            </Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <p className="text-sm text-text-muted">Tidak ada rapat terjadwal.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcomingMeetings.slice(0, 4).map((meeting) => {
                const live = new Date(meeting.startsAt).getTime() <= nowDate.getTime()
                return (
                  <li key={meeting.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{meeting.title}</span>
                    <span className="whitespace-nowrap text-xs text-text-muted tnum">{formatDateTime(meeting.startsAt)}</span>
                    {live && (
                      <span className="rounded-full border border-primary-strong/60 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Berlangsung
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-label="Ringkasan tugas" className="card-lift rounded-[12px] border border-border-main bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold">Ringkasan tugas</h2>
          <ProgressBar progress={completion} />
          <TrendChart tasks={snapshot.tasks} now={nowDate} />
        </section>
      </div>

      {/* Team activity from the real activity log */}
      <ActivityFeed snapshot={snapshot} now={nowDate} />

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

const TONE_STYLES = {
  primary: { text: 'text-primary', tile: 'bg-primary/10 text-primary', bar: 'bg-primary' },
  info: { text: 'text-info', tile: 'bg-info/10 text-info', bar: 'bg-info' },
  warning: { text: 'text-warning', tile: 'bg-warning/10 text-warning', bar: 'bg-warning' },
  danger: { text: 'text-danger', tile: 'bg-danger/10 text-danger', bar: 'bg-danger' },
  muted: { text: 'text-text-muted', tile: 'bg-surface-raised text-text-muted', bar: 'bg-border-main' },
} as const

function MetricCard({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string
  value: number | string
  tone: keyof typeof TONE_STYLES
  icon: React.ReactNode
  hint: string
}) {
  const styles = TONE_STYLES[tone]
  return (
    <div className="card-lift relative overflow-hidden rounded-[13px] border border-border-main bg-surface p-3.5 sm:p-4">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${styles.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs leading-tight text-text-muted">{label}</p>
          <p className={`mt-1 text-2xl font-semibold tnum sm:text-3xl ${styles.text}`}>{value}</p>
          <p className="mt-1 truncate text-[11px] text-text-muted">{hint}</p>
        </div>
        <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${styles.tile}`}>
          {icon}
        </span>
      </div>
    </div>
  )
}

/** Bar chart: tasks completed per day over the last 14 days (from completedAt). */
function TrendChart({ tasks, now }: { tasks: Task[]; now: Date }) {
  const days = useMemo(() => {
    const buckets = Array.from({ length: 14 }, () => 0)
    for (const task of tasks) {
      if (task.status !== 'done' || !task.completedAt) continue
      const done = new Date(task.completedAt)
      const dayDiff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(done.getFullYear(), done.getMonth(), done.getDate()).getTime()) / 86400000)
      if (dayDiff >= 0 && dayDiff < 14) buckets[13 - dayDiff] = (buckets[13 - dayDiff] ?? 0) + 1
    }
    return buckets
  }, [tasks, now])

  const max = Math.max(1, ...days)
  const total = days.reduce((a, b) => a + b, 0)

  return (
    <div className="mt-4">
      <p className="mb-1 text-xs text-text-muted">Tugas selesai · 14 hari terakhir ({total})</p>
      <svg viewBox="0 0 280 60" className="h-14 w-full" role="img" aria-label={`Grafik batang: ${total} tugas selesai dalam 14 hari terakhir, puncaknya ${max} selesai per hari.`}>
        {days.map((count, i) => {
          const h = count === 0 ? 2 : Math.max(4, (count / max) * 52)
          return (
            <rect
              key={i}
              x={i * 20 + 2}
              y={58 - h}
              width={14}
              height={h}
              rx={2}
              fill={count === 0 ? 'var(--color-border)' : 'var(--color-success)'}
            />
          )
        })}
      </svg>
    </div>
  )
}

/** Banner for tasks due today/tomorrow — honest, dated, linked. */
function DueSoonBanner({ tasks, now }: { tasks: Task[]; now: Date }) {
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today = tasks.filter((t) => t.dueAt && t.status !== 'done' && t.status !== 'cancelled' && dayStart(new Date(t.dueAt)) === dayStart(now))
  const tomorrow = tasks.filter((t) => t.dueAt && t.status !== 'done' && t.status !== 'cancelled' && dayStart(new Date(t.dueAt)) === dayStart(now) + 86400000)
  if (today.length === 0 && tomorrow.length === 0) return null
  return (
    <section
      aria-label="Pengingat tenggat"
      className="flex flex-col gap-1 rounded-[12px] border border-warning/50 bg-warning/10 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.5)]"
    >
      {today.length > 0 && (
        <p className="text-sm font-medium text-warning">
          <IconClock className="mr-1 inline" /> {today.length} tugas jatuh tempo hari ini:{' '}
          <span className="font-normal">{today.map((t) => t.title).join(', ')}</span>
        </p>
      )}
      {tomorrow.length > 0 && (
        <p className="text-sm text-warning">
          Besok: <span className="font-normal">{tomorrow.map((t) => t.title).join(', ')}</span>
        </p>
      )}
      <Link to="tugas" className="text-xs font-medium text-info underline underline-offset-2">
        Buka daftar tugas
      </Link>
    </section>
  )
}

const ACTIVITY_VERBS: Record<string, string> = {
  'task.created': 'menambahkan tugas',
  'task.updated': 'memperbarui tugas',
  'task.status_changed': 'mengubah status tugas',
  'task.commented': 'mengomentari tugas',
  'task.deleted': 'menghapus tugas',
  'program.created': 'menambahkan program kerja',
  'program.completed': 'menyelesaikan program kerja',
  'program.planned': 'menjadwalkan program kerja',
  'program.active': 'menjalankan program kerja',
  'program.blocked': 'menandai program terhambat',
  'program.archived': 'mengarsipkan program kerja',
  'meeting.created': 'menjadwalkan rapat',
  'decision.created': 'mencatat keputusan rapat',
  'decision.task_created': 'membuat tugas tindak lanjut',
}

/** Latest team activity, straight from the saved activity log. */
function ActivityFeed({ snapshot, now }: { snapshot: WorkspaceSnapshot; now: Date }) {
  const events = [...snapshot.activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  return (
    <section aria-label="Aktivitas terbaru" className="rounded-[12px] border border-border-main bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Aktivitas terbaru</h2>
        <span className="text-[11px] text-text-muted">Dari log aktivitas tersimpan</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-text-muted">Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => {
            const actor = event.actorUserId ? snapshot.profiles[event.actorUserId]?.displayName : null
            const title = event.metadata.taskTitle ?? event.metadata.programTitle ?? event.metadata.meetingTitle ?? ''
            const verb = ACTIVITY_VERBS[event.action] ?? event.action
            return (
              <li key={event.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">{actor ?? 'Sistem'}</span>
                <span className="text-text-muted">{verb}</span>
                {title && <span className="min-w-0 flex-1 truncate">“{title}”</span>}
                <span className="text-xs text-text-muted tnum">{formatRelative(event.createdAt, now)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
