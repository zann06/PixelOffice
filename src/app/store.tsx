import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, WorkspaceSnapshot } from '../types/data'
import { createDataClient } from '../lib/data'
import type { DataClient } from '../lib/data'

type Status = 'loading' | 'signed-out' | 'ready' | 'error'

interface AppContextValue {
  client: DataClient
  session: Session | null
  status: Status
  error: string | null
  workspaces: { id: string; name: string }[]
  snapshot: WorkspaceSnapshot | null
  refresh: () => Promise<void>
  switchWorkspace: (workspaceId: string) => Promise<void>
  signInAs: (userId: string) => Promise<void>
  signOut: () => Promise<void>
  /** Epoch ms of the last successful fetch — drives "Terakhir diperbarui". */
  lastUpdatedAt: number | null
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp harus dipakai di dalam AppProvider')
  return ctx
}

export function AppProvider({ children, client: injectedClient }: { children: ReactNode; client?: DataClient }) {
  const client = useMemo(() => injectedClient ?? createDataClient(), [injectedClient])
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([])
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const current = await client.getSession()
    if (!current.userId) {
      setSession(current)
      setStatus('signed-out')
      setSnapshot(null)
      setWorkspaces([])
      return
    }
    setSession(current)
    try {
      const list = await client.listWorkspacesForSession()
      if (list.length === 0) {
        // Authenticated but not a member of any workspace (demo dataset never
        // produces this; guarded for completeness).
        setStatus('error')
        setError('Akun ini belum menjadi anggota workspace mana pun.')
        return
      }
      setWorkspaces(list)
      const preferred = snapshot?.workspace.id
      const targetId = preferred && list.some((w) => w.id === preferred) ? preferred : (list[0]?.id ?? null)
      if (!targetId) {
        setStatus('error')
        setError('Tidak ada workspace yang dapat dimuat.')
        return
      }
      const next = await client.fetchWorkspace(targetId)
      setSnapshot(next)
      setLastUpdatedAt(Date.now())
      setStatus('ready')
      setError(null)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Gagal memuat data.')
    }
  }, [client, snapshot?.workspace.id])

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      setStatus('loading')
      try {
        const next = await client.fetchWorkspace(workspaceId)
        setSnapshot(next)
        setLastUpdatedAt(Date.now())
        setStatus('ready')
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Gagal memuat workspace.')
      }
    },
    [client],
  )

  useEffect(() => {
    void refresh()
    // Initial load only; `refresh` intentionally excluded to avoid reload loops.
  }, [])

  const signInAs = useCallback(
    async (userId: string) => {
      await client.signInAs(userId)
      setStatus('loading')
      setSnapshot(null)
      await refresh()
    },
    [client, refresh],
  )

  const signOut = useCallback(async () => {
    await client.signOut()
    setSnapshot(null)
    setWorkspaces([])
    setSession({ userId: null })
    setStatus('signed-out')
  }, [client])

  const value = useMemo<AppContextValue>(
    () => ({
      client,
      session,
      status,
      error,
      workspaces,
      snapshot,
      refresh,
      switchWorkspace,
      signInAs,
      signOut,
      lastUpdatedAt,
    }),
    [client, session, status, error, workspaces, snapshot, refresh, switchWorkspace, signInAs, signOut, lastUpdatedAt],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
