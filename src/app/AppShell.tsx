import { useEffect, useState } from 'react'
import { PixelSelect } from '../components/ui/PixelSelect'
import { PixelClock } from '../features/pixel-office/PixelClock'
import type { ReactNode } from 'react'
import { Link, useRoute } from './routing'
import { useRouter } from './router'
import { CommandPalette } from '../features/search/CommandPalette'
import { WorkspaceCreateDialog } from '../features/workspaces/WorkspaceCreateDialog'
import { NotificationBell } from '../components/ui/NotificationBell'
import { IconPlus, IconSearch } from '../components/ui/icons'
import type { Route } from './router'
import { useApp } from './store'
import { useSettings } from './settings'
import { formatRelative } from '../lib/format'
import { RoleBadge } from '../components/ui/StatusBadge'
import { Avatar } from '../components/ui/Form'
import { IconHome, IconMeeting, IconSettings, IconSignOut, IconTasks, IconUsers, LogoMark, IconMenu } from '../components/ui/icons'

interface NavItem {
  route: Route
  label: string
  icon: typeof IconHome
}

const NAV: NavItem[] = [
  { route: 'dashboard', label: 'Dasbor', icon: IconHome },
  { route: 'program', label: 'Program Kerja', icon: IconHome },
  { route: 'tugas', label: 'Tugas', icon: IconTasks },
  { route: 'rapat', label: 'Rapat', icon: IconMeeting },
  { route: 'anggota', label: 'Anggota', icon: IconUsers },
  { route: 'pengaturan', label: 'Pengaturan', icon: IconSettings },
]

const MOBILE_NAV: NavItem[] = [
  { route: 'dashboard', label: 'Dasbor', icon: IconHome },
  { route: 'tugas', label: 'Tugas', icon: IconTasks },
  { route: 'rapat', label: 'Rapat', icon: IconMeeting },
  { route: 'anggota', label: 'Anggota', icon: IconUsers },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const route = useRoute()
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = route === item.route
        const Icon = item.icon
        return (
          <Link
            key={item.route}
            to={item.route}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-[9px] px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary/10 text-primary shadow-[inset_3px_0_0_#2e3a52]'
                : 'text-text-muted hover:bg-surface-raised hover:text-text-main'
            }`}
          >
            <span
              aria-hidden
              className={`grid h-7 w-7 place-items-center rounded-[7px] border transition-colors ${
                active ? 'border-primary/20 bg-surface text-primary' : 'border-transparent text-text-muted group-hover:text-text-main'
              }`}
            >
              <Icon width={17} height={17} />
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { snapshot, session, workspaces, switchWorkspace, signOut, lastUpdatedAt } = useApp()
  const [, navigate] = useRouter()
  const { motionEnabled, setMotionEnabled } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [wsOpen, setWsOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const me = session?.userId ? snapshot?.profiles[session.userId] : null
  const myRole = session?.userId && snapshot ? snapshot.memberships.find((m) => m.userId === session.userId)?.role ?? null : null

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-border-main bg-gradient-to-b from-surface to-[#fbfaf6] px-4 py-5 lg:flex">
          <Link to="dashboard" className="flex items-center gap-2.5 px-1">
            <LogoMark />
            <span className="flex flex-col leading-none">
              <span className="pixel-label text-sm text-text-main">PixelOffice</span>
              <span className="mt-1 text-[10px] font-medium text-text-muted">Ruang kerja tim</span>
            </span>
          </Link>

          <div>
            <label htmlFor="workspace-switcher" className="pixel-label mb-1 block text-[10px] text-text-muted">
              Workspace
            </label>
            <PixelSelect
              id="workspace-switcher"
              className="w-full rounded-[9px] border border-border-main bg-surface-raised px-2.5 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors hover:border-primary/30"
              value={snapshot?.workspace.id ?? ''}
              onChange={(e) => void switchWorkspace(e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </PixelSelect>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 rounded-[9px] border border-border-main bg-surface-raised px-3 py-2 text-sm text-text-muted transition-colors hover:border-primary/30 hover:text-text-main"
          >
            <IconSearch aria-hidden />
            Cari cepat
            <kbd className="ml-auto rounded-[4px] border border-border-main bg-surface px-1 text-[10px]">Ctrl K</kbd>
          </button>

          <NotificationBell />

          <button
            type="button"
            onClick={() => setWsOpen(true)}
            className="flex items-center gap-2 rounded-[8px] border border-dashed border-border-main px-3 py-2 text-sm text-text-muted hover:text-text-main"
          >
            <IconPlus aria-hidden /> Workspace baru
          </button>

          <NavLinks />

          <div className="mt-auto flex flex-col gap-3">
            <PixelClock />
            <div className="rounded-[10px] border border-border-main bg-surface-raised/70 px-3 py-2">
              <p className="pixel-label text-[9px] text-text-muted">Mode demo</p>
              <p className="mt-0.5 text-[11px] leading-snug text-text-muted">Data tersimpan lokal di browser ini. Bukan backend produksi.</p>
            </div>
            <button
              type="button"
              onClick={() => setMotionEnabled(!motionEnabled)}
              className="flex items-center justify-between rounded-[9px] border border-border-main bg-surface px-3 py-2 text-xs text-text-muted transition-colors hover:text-text-main"
              aria-pressed={motionEnabled}
            >
              Animasi kantor
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${motionEnabled ? 'bg-success/15 text-success' : 'bg-surface-raised text-text-muted'}`}>
                {motionEnabled ? 'Aktif' : 'Mati'}
              </span>
            </button>
            <div className="flex items-center gap-2 rounded-[10px] border border-border-main bg-surface px-3 py-2 shadow-[0_1px_0_rgba(255,255,255,0.7)]">
              <Avatar name={me?.displayName ?? '?'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{me?.displayName}</p>
                {myRole && <RoleBadge role={myRole} />}
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Keluar"
                title="Keluar"
                className="rounded-[6px] p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-main"
              >
                <IconSignOut />
              </button>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border-main bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              className="rounded-[8px] p-2 text-text-muted hover:bg-surface-raised"
              aria-label="Buka menu navigasi"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <IconMenu width={20} height={20} />
            </button>
            <Link to="dashboard" className="flex items-center gap-2">
              <LogoMark size={22} />
              <span className="pixel-label text-xs">PixelOffice</span>
            </Link>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Cari cepat"
              className="ml-auto rounded-[8px] p-2 text-text-muted hover:bg-surface-raised"
            >
              <IconSearch width={18} height={18} />
            </button>
            <span className="max-w-24 truncate text-xs text-text-muted">{snapshot?.workspace.name}</span>
          </header>

          {menuOpen && (
            <div className="border-b border-border-main bg-surface px-4 py-4 lg:hidden">
              <NavLinks onNavigate={() => setMenuOpen(false)} />
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-3 flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm text-danger"
              >
                <IconSignOut /> Keluar ({me?.displayName})
              </button>
            </div>
          )}

          <main id="main-content" className="app-canvas mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10">
            {children}
          </main>

          <footer className="hidden border-t border-border-main px-8 py-3 text-xs text-text-muted lg:block">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              <span>PixelOffice v0.1.0 (demo lokal) — alat produktivitas, bukan game.</span>
              {lastUpdatedAt && <span>Terakhir diperbarui: {formatRelative(lastUpdatedAt)}</span>}
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-main bg-surface/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => (
          <BottomLink key={item.route} item={item} />
        ))}
      </nav>

      {wsOpen && (
        <WorkspaceCreateDialog
          onClose={() => setWsOpen(false)}
          onCreated={async (id) => {
            setWsOpen(false)
            await switchWorkspace(id)
          }}
        />
      )}

      {snapshot && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          snapshot={snapshot}
          onNavigate={navigate}
        />
      )}
    </div>
  )
}

function BottomLink({ item }: { item: NavItem }) {
  const route = useRoute()
  const active = route === item.route
  const Icon = item.icon
  return (
    <Link
      to={item.route}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium ${active ? 'text-primary' : 'text-text-muted'}`}
    >
      <Icon width={20} height={20} />
      {item.label}
    </Link>
  )
}
