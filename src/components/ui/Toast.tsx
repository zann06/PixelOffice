import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IconAlert, IconCheck } from './icons'

interface ToastMessage {
  id: number
  kind: 'success' | 'error'
  text: string
}

interface ToastContextValue {
  showToast: (kind: 'success' | 'error', text: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}

/**
 * Announced politely for screen readers (aria-live). Motion is minimal and
 * frozen when reduced motion is active (see index.css).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(1)

  const showToast = useCallback((kind: 'success' | 'error', text: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, kind, text }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2 rounded-[8px] border px-3 py-2 text-sm shadow-lg ${
              toast.kind === 'success'
                ? 'border-success/60 bg-success/10 text-success'
                : 'border-danger/60 bg-danger/10 text-danger'
            }`}
          >
            {toast.kind === 'success' ? <IconCheck /> : <IconAlert />}
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-auto text-xs underline underline-offset-2"
            >
              Tutup
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
