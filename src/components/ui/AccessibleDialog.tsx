import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Drawer slides from the right; dialog is centered. */
  variant?: 'dialog' | 'drawer'
  footer?: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog (docs/DESIGN_SYSTEM.md §5 `AccessibleDialog`):
 * aria-modal, labelled by the title, focus trapped, Escape closes,
 * initial focus on the panel, focus restored on close.
 */
export function AccessibleDialog({ open, onClose, title, children, variant = 'dialog', footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE)
    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      panel?.focus()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const position =
    variant === 'drawer'
      ? 'fixed inset-y-0 right-0 h-full w-full max-w-md shadow-2xl'
      : 'relative w-full max-w-lg shadow-2xl'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/60 p-4 sm:p-6"
      style={variant === 'drawer' ? { padding: 0, justifyContent: 'flex-end' } : { alignItems: 'flex-start', paddingTop: '8vh' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex flex-col overflow-y-auto rounded-[12px] border border-border-main bg-surface ${position}`}
      >
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-border-main bg-surface px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-text-muted hover:bg-surface-raised hover:text-text-main"
            aria-label="Tutup"
          >
            <IconClose />
          </button>
        </div>
        <div className="flex-1 px-4 py-4">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-border-main bg-surface px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
