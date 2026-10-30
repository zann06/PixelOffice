import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Generous async waits: the suite runs several jsdom environments in parallel.
configure({ asyncUtilTimeout: 4000 })

// jsdom lacks IntersectionObserver; the scene pauses via it. Stub for tests.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  // @ts-expect-error test stub
  window.IntersectionObserver = IntersectionObserverStub
}

// jsdom lacks matchMedia; the settings provider reads prefers-reduced-motion.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// Newer Node builds ship a partial global `localStorage` that shadows the full
// jsdom Storage. Replace it with a working in-memory Storage when broken.
const existing = globalThis.localStorage as Storage | undefined
if (!existing || typeof existing.clear !== 'function' || typeof existing.getItem !== 'function') {
  const map = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
}
