import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocalDataClient } from '../src/lib/data/LocalDataClient'
import { AppProvider } from '../src/app/store'
import { SettingsProvider } from '../src/app/settings'
import { ToastProvider } from '../src/components/ui/Toast'
import { MeetingsPage } from '../src/features/meetings/MeetingsPage'
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
})

describe('MeetingsPage — decision to follow-up task (Flow E)', () => {
  it('lists meetings with agenda info and attendees from saved data', async () => {
    const client = new LocalDataClient()
    await client.signInAs('u-ratna')
    renderWithProviders(<MeetingsPage />, client)

    expect(await screen.findByText('Rapat Koordinasi Mingguan')).toBeInTheDocument()
    expect(screen.getByText('Rapat Perencanaan Event')).toBeInTheDocument()
  })

  it('converts a decision into a linked task without duplicating the decision', async () => {
    const user = userEvent.setup()
    const client = new LocalDataClient()
    // Owner: org-wide meetings are editable by admin/owner only (lead is
    // limited to their department — mirrors the RLS policy).
    await client.signInAs('u-ratna')
    renderWithProviders(<MeetingsPage />, client)

    // Open the past planning meeting.
    await user.click(await screen.findByRole('button', { name: /Rapat Perencanaan Event/ }))

    // The already-converted decision shows its linked task; the pending one offers "Jadikan tugas".
    expect(await screen.findByText(/Tema event ditetapkan/)).toBeInTheDocument()
    const convertButtons = await screen.findAllByRole('button', { name: 'Jadikan tugas' })
    await user.click(convertButtons[0]!)

    const titleInput = await screen.findByLabelText(/Judul tugas/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Pangkas anggaran konsumsi panitia')
    const dialog = screen.getByRole('dialog', { name: 'Tugas tindak lanjut' })
    await user.click(within(dialog).getByRole('button', { name: 'Buat tugas' }))

    await waitFor(() => {
      expect(screen.getAllByText(/Tugas tindak lanjut dibuat dari keputusan/).length).toBeGreaterThan(0)
    })

    const verify = new LocalDataClient()
    const snapshot = await verify.fetchWorkspace(WORKSPACE_A)
    const task = snapshot.tasks.find((t) => t.title === 'Pangkas anggaran konsumsi panitia')!
    expect(task.decisionId).toBe('dc-anggaran')
    // Exactly one task per decision.
    expect(snapshot.tasks.filter((t) => t.decisionId === 'dc-anggaran')).toHaveLength(1)
  })
})
