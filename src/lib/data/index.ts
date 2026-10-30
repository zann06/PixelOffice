import type { DataClient } from './DataClient'
import { LocalDataClient } from './LocalDataClient'

/**
 * Adapter factory. In production this is where a Supabase-backed DataClient
 * would be constructed from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (public
 * configuration only — no privileged secrets in the browser, docs/SECURITY.md
 * §6). Until those credentials exist, the local demo adapter is used.
 */
export function createDataClient(): DataClient {
  return new LocalDataClient()
}

export type { DataClient }
