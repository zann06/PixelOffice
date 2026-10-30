import 'vitest-canvas-mock'
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import App from '../src/app/App'

beforeAll(() => {
  ;(globalThis as any).IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} }
  ;(globalThis as any).ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }
  HTMLElement.prototype.scrollIntoView = () => {}
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }))
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1100 })
})

describe('add member via UI', () => {
  it('owner adds a member with a pinned seat and sees it in the table', async () => {
    localStorage.clear()
    render(<App />)
    const btn = await screen.findByText('Ratna Wijaya')
    await act(async () => { btn.click() })
    await waitFor(() => expect(document.querySelector('canvas')).not.toBeNull(), { timeout: 4000 })
    await act(async () => { window.location.hash = '#/anggota'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    fireEvent.click(await screen.findByText('+ Tambah anggota'))
    fireEvent.change(await screen.findByLabelText('Nama'), { target: { value: 'Dewi Pendatang' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'Ruang duduk' }))
    fireEvent.click(screen.getByText('Ruang Arsip'))
    fireEvent.click(screen.getByRole('combobox', { name: 'Kursi' }))
    fireEvent.click(screen.getByText('Kursi 2'))
    fireEvent.click(screen.getByText('Tambahkan'))
    await waitFor(() => expect(screen.getAllByText('Dewi Pendatang').length).toBeGreaterThan(0), { timeout: 4000 })
    expect(screen.getByText(/Ruang Arsip · Kursi 2/)).toBeTruthy()
  }, 20000)
})
