import { useEffect, useState } from 'react'

/**
 * Minimal hash router (avoids adding a dependency — docs/CONTRIBUTING.md).
 * Routes: '' | 'program' | 'tugas' | 'rapat' | 'anggota' | 'pengaturan'
 */
export const ROUTES = ['dashboard', 'program', 'tugas', 'rapat', 'anggota', 'pengaturan'] as const
export type Route = (typeof ROUTES)[number]

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as readonly string[]).includes(hash) ? (hash as Route) : 'dashboard'
}

export function useRouter(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash())

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: Route) => {
    window.location.hash = `#/${next}`
  }

  return [route, navigate]
}

/** Read-only route hook for link components. */
export function useRoute(): Route {
  return useRouter()[0]
}
