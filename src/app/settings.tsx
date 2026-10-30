import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Presentation settings: in-app motion toggle + scene/list preference.
 * The motion toggle defaults from the OS `prefers-reduced-motion` setting and
 * is persisted locally (docs/REFERENCE.md scene rules).
 */

interface SettingsContextValue {
  motionEnabled: boolean
  setMotionEnabled: (value: boolean) => void
  defaultDashboardView: 'scene' | 'list'
  setDefaultDashboardView: (value: 'scene' | 'list') => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings harus dipakai di dalam SettingsProvider')
  return ctx
}

const MOTION_KEY = 'pixeloffice.settings.motion'
const VIEW_KEY = 'pixeloffice.settings.dashboardView'

function readInitialMotion(): boolean {
  try {
    const stored = localStorage.getItem(MOTION_KEY)
    if (stored === 'on') return true
    if (stored === 'off') return false
  } catch {
    // localStorage unavailable — fall back to the media query below.
  }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readInitialView(): 'scene' | 'list' {
  try {
    const stored = localStorage.getItem(VIEW_KEY)
    if (stored === 'list') return 'list'
    if (stored === 'scene') return 'scene'
  } catch {
    // ignore
  }
  return 'scene'
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [motionEnabled, setMotionEnabledState] = useState<boolean>(() => readInitialMotion())
  const [defaultDashboardView, setDefaultDashboardViewState] = useState<'scene' | 'list'>(() => readInitialView())

  useEffect(() => {
    document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off'
  }, [motionEnabled])

  const setMotionEnabled = (value: boolean) => {
    setMotionEnabledState(value)
    try {
      localStorage.setItem(MOTION_KEY, value ? 'on' : 'off')
    } catch {
      // ignore
    }
  }

  const setDefaultDashboardView = (value: 'scene' | 'list') => {
    setDefaultDashboardViewState(value)
    try {
      localStorage.setItem(VIEW_KEY, value)
    } catch {
      // ignore
    }
  }

  const value = useMemo(
    () => ({ motionEnabled, setMotionEnabled, defaultDashboardView, setDefaultDashboardView }),
    [motionEnabled, defaultDashboardView],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
