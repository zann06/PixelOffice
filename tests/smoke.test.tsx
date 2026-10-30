import 'vitest-canvas-mock'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import App from '../src/app/App'

beforeAll(() => {
  class IO { observe() {} disconnect() {} unobserve() {} constructor(cb: (e: unknown[]) => void) { setTimeout(() => cb([{ isIntersecting: true }]), 0) } }
  class RO { observe() {} disconnect() {} unobserve() {} }
  ;(globalThis as any).IntersectionObserver = IO
  ;(globalThis as any).ResizeObserver = RO
  window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }))
  HTMLElement.prototype.scrollIntoView = () => {}
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1100 })
})

describe('smoke', () => {
  it('signs in and renders every route without errors', async () => {
    const errors: string[] = []
    vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)) })
    window.addEventListener('error', (e) => errors.push('window: ' + e.message))
    render(<App />)
    const btn = await screen.findByText('Ratna Wijaya')
    await act(async () => { btn.click() })
    await waitFor(() => expect(document.querySelector('canvas')).not.toBeNull(), { timeout: 4000 })
    for (const r of ['dashboard', 'program', 'tugas', 'rapat', 'anggota', 'pengaturan']) {
      await act(async () => { window.location.hash = `#/${r}`; window.dispatchEvent(new HashChangeEvent('hashchange')) })
      await new Promise((res) => setTimeout(res, 150))
      expect(document.body.textContent?.length).toBeGreaterThan(50)
    }
    // act(...) warnings from async/interval-driven state updates are testing
    // noise; the smoke check is about real render errors.
    const realErrors = errors.filter((e) => !e.includes('not wrapped in act('))
    expect(realErrors).toEqual([])
  }, 30000)
})
