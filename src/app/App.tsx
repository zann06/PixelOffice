import { AppProvider, useApp } from './store'
import { SettingsProvider } from './settings'
import { AppShell } from './AppShell'
import { DemoSignIn } from './DemoSignIn'
import { useRouter } from './router'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ProgramsPage } from '../features/programs/ProgramsPage'
import { TasksPage } from '../features/tasks/TasksPage'
import { MeetingsPage } from '../features/meetings/MeetingsPage'
import { MembersPage } from '../features/members/MembersPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LoadingSkeleton, ErrorState } from '../components/ui/States'
import { ToastProvider } from '../components/ui/Toast'

function RoutedContent() {
  const [route] = useRouter()
  return <div key={route} className="fade-up"><RouteView route={route} /></div>
}

function RouteView({ route }: { route: ReturnType<typeof useRouter>[0] }) {
  switch (route) {
    case 'dashboard':
      return <DashboardPage />
    case 'program':
      return <ProgramsPage />
    case 'tugas':
      return <TasksPage />
    case 'rapat':
      return <MeetingsPage />
    case 'anggota':
      return <MembersPage />
    case 'pengaturan':
      return <SettingsPage />
  }
}

function AuthGate() {
  const { status, error, refresh } = useApp()

  if (status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <LoadingSkeleton lines={6} />
        <span className="sr-only" role="status">
          Memuat…
        </span>
      </div>
    )
  }
  if (status === 'signed-out') return <DemoSignIn />
  if (status === 'error') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <ErrorState title="Gagal memuat workspace" description={error ?? undefined} onRetry={() => void refresh()} />
      </div>
    )
  }
  return (
    <AppShell>
      <RoutedContent />
    </AppShell>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AppProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </AppProvider>
    </SettingsProvider>
  )
}
