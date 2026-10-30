import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocalDataClient } from '../src/lib/data/LocalDataClient'
import { AppProvider } from '../src/app/store'
import { SettingsProvider } from '../src/app/settings'
import { ToastProvider } from '../src/components/ui/Toast'
import { DashboardPage } from '../src/features/dashboard/DashboardPage'
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
})

describe('DashboardPage — metrics and pixel office from saved data', () => {
  it('shows metric cards computed from the snapshot', async () => {
    const client = new LocalDataClient()
    await client.signInAs('u-ratna')
    renderWithProviders(<DashboardPage />, client)

    expect(await screen.findByRole('heading', { name: 'Dasbor' })).toBeInTheDocument()
    expect(screen.getByText('Program berjalan')).toBeInTheDocument()
    expect(screen.getByText('Tugas terlambat')).toBeInTheDocument()
    // Seed has exactly 3 active programs in workspace A.
    const activeCard = screen.getByText('Program berjalan').closest('div')!
    expect(within(activeCard).getByText('3')).toBeInTheDocument()
  })

  it('renders the pixel scene summary and a keyboard-accessible roster mirroring the same data', async () => {
    const client = new LocalDataClient()
    await client.signInAs('u-ratna')
    renderWithProviders(<DashboardPage />, client)

    // role="img" summary of the scene (screen-reader alternative).
    const scene = await screen.findByRole('img', { name: /Kantor pixel-art/ })
    expect(scene).toBeInTheDocument()

    // Roster lists every member with derived states.
    const roster = screen.getByRole('list', { name: /Daftar anggota dan status kerja/i })
    expect(within(roster).getByText('Fajar Nugroho')).toBeInTheDocument()
    expect(within(roster).getByText('Anton Prakoso')).toBeInTheDocument()
    // Member without department shows the honest state.
    expect(within(roster).getAllByText(/Tanpa divisi/).length).toBeGreaterThan(0)
  })

  it('opening a member from the roster shows their saved tasks and allows status update', async () => {
    const user = userEvent.setup()
    const client = new LocalDataClient()
    await client.signInAs('u-fajar')
    renderWithProviders(<DashboardPage />, client)

    const roster = await screen.findByRole('list', { name: /Daftar anggota/i })
    await user.click(within(roster).getByRole('button', { name: /Andi Saputra/ }))

    const dialog = await screen.findByRole('dialog', { name: /Anggota: Andi Saputra/ })
    expect(within(dialog).getByText('Implementasi halaman utama')).toBeInTheDocument()
    expect(within(dialog).getByText('Setup domain dan hosting')).toBeInTheDocument()

    const statusSelect = within(dialog).getByRole('combobox', { name: /ubah status tugas implementasi halaman utama/i })
    await user.selectOptions(statusSelect, 'done')
    await waitFor(() => {
      expect(screen.getAllByText('Status tugas tersimpan.').length).toBeGreaterThan(0)
    })
  })

  it('announces a live meeting when one is in its saved window', async () => {
    const client = new LocalDataClient()
    await client.signInAs('u-ratna')
    renderWithProviders(<DashboardPage />, client)
    // Seed schedules "Rapat Koordinasi Mingguan" live around seed time.
    expect(await screen.findByText(/Rapat berlangsung: Rapat Koordinasi Mingguan/)).toBeInTheDocument()
  })
})
