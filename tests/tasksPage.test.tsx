import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocalDataClient } from '../src/lib/data/LocalDataClient'
import { AppProvider } from '../src/app/store'
import { SettingsProvider } from '../src/app/settings'
import { ToastProvider } from '../src/components/ui/Toast'
import { TasksPage } from '../src/features/tasks/TasksPage'
import { WORKSPACE_A } from '../src/lib/data/seed'
import type { DataClient } from '../src/lib/data/DataClient'

function renderWithProviders(ui: React.ReactElement, client: DataClient) {
  return render(
    <SettingsProvider>
      <AppProvider client={client}>
        <ToastProvider>{ui}</ToastProvider>
      </AppProvider>
    </SettingsProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
})

describe('TasksPage (integration through the data layer)', () => {
  it('renders tasks from saved data with status labels', async () => {
    const client = new LocalDataClient()
    await client.signInAs('u-fajar')
    renderWithProviders(<TasksPage />, client)

    expect(await screen.findByRole('heading', { name: 'Tugas' })).toBeInTheDocument()
    expect(await screen.findByText('Implementasi halaman utama')).toBeInTheDocument()
    // Status badges carry text, never color alone.
    expect(await screen.findAllByText('Dikerjakan').then((els) => els.length)).toBeGreaterThan(0)
    expect(screen.getAllByText(/PJ:/).length).toBeGreaterThan(0)
  })

  it('updates task status and persists it (Flow D: UI shows confirmed saved state)', async () => {
    const user = userEvent.setup()
    const client = new LocalDataClient()
    await client.signInAs('u-fajar')
    renderWithProviders(<TasksPage />, client)

    const select = await screen.findByRole('combobox', { name: /ubah status implementasi halaman utama/i })
    await user.click(select)
    await user.click(await screen.findByRole('option', { name: 'Selesai' }))

    await waitFor(() => {
      expect(screen.getAllByText('Status tugas tersimpan.').length).toBeGreaterThan(0)
    })

    // Persisted: a fresh client (new adapter instance, same storage) sees 'done'.
    const verify = new LocalDataClient()
    const snapshot = await verify.fetchWorkspace(WORKSPACE_A)
    const task = snapshot.tasks.find((t) => t.title === 'Implementasi halaman utama')!
    expect(task.status).toBe('done')
    expect(task.completedAt).not.toBeNull()
  })

  it('shows the overdue filter and filters accordingly', async () => {
    const user = userEvent.setup()
    const client = new LocalDataClient()
    await client.signInAs('u-ratna')
    renderWithProviders(<TasksPage />, client)

    const statusSelect = await screen.findByRole('combobox', { name: 'Filter status' })
    await user.click(statusSelect)
    await user.click(await screen.findByRole('option', { name: 'Terlambat' }))

    expect((await screen.findAllByText(/Terlambat \d+ hari/)).length).toBeGreaterThan(0)
    expect(screen.queryByText('Implementasi halaman program kerja')).not.toBeInTheDocument()
  })

  it('hides task creation from members and shows the permission note', async () => {
    const client = new LocalDataClient()
    await client.signInAs('u-maya') // member
    renderWithProviders(<TasksPage />, client)
    await screen.findByRole('heading', { name: 'Tugas' })
    expect(screen.queryByRole('button', { name: /tugas baru/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Pembuatan tugas hanya untuk/i)).toBeInTheDocument()
  })
})
