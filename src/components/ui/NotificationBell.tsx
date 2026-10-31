import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../app/store'
import { buildNotifications } from '../../lib/notifications'
import { formatDueLabel, formatDateTime } from '../../lib/format'
import { Link } from '../../app/routing'
import { IconClose } from './icons'

/**
 * In-app notification center: overdue tasks, due today/tomorrow, and upcoming
 * meetings — derived purely from the same saved snapshot the rest of the app
 * reads (no push backend).
 *
 * The panel renders through a portal with fixed positioning so it never gets
 * clipped by scrollable containers (the sidebar scrolls on short screens).
 */
export function NotificationBell() {
  const { snapshot } = useApp()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const now = new Date()
  const items = snapshot ? buildNotifications(snapshot.tasks, snapshot.meetings, now) : []
  const overdue = items.filter((i) => i.kind === 'overdue').length

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = btnRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(320, window.innerWidth - 16)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
      setPos({ top: rect.bottom + 6, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    function onDown(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifikasi (${items.length} item)`}
        className="flex w-full items-center gap-2 rounded-[9px] border border-border-main bg-surface-raised px-3 py-2 text-sm text-text-muted transition-colors hover:border-primary/30 hover:text-text-main"
      >
        🔔 Notifikasi
        {items.length > 0 && (
          <span
            aria-hidden
            className={`ml-auto rounded-full px-1.5 text-[10px] font-bold tnum ${
              overdue > 0 ? 'bg-danger/20 text-danger' : 'bg-info/20 text-info'
            }`}
          >
            {items.length}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Pusat notifikasi"
            className="fixed z-[70] rounded-[12px] border border-border-main bg-surface p-2 shadow-2xl"
            style={{ top: pos.top, left: pos.left, width: Math.min(320, window.innerWidth - 16) }}
          >
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Notifikasi</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  btnRef.current?.focus()
                }}
                aria-label="Tutup notifikasi"
                className="rounded-[6px] p-1 text-text-muted hover:text-text-main"
              >
                <IconClose />
              </button>
            </div>
            {items.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-text-muted">Tidak ada yang perlu diperhatikan. 👌</p>
            ) : (
              <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.key}>
                    <Link
                      to={item.route}
                      onClick={() => setOpen(false)}
                      className={`block rounded-[8px] border px-3 py-2 text-sm hover:bg-surface-raised ${
                        item.kind === 'overdue' ? 'border-danger/40' : 'border-transparent'
                      }`}
                    >
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className={`block text-xs ${item.kind === 'overdue' ? 'text-danger' : 'text-text-muted'}`}>
                        {item.detail}
                        {item.kind.startsWith('meeting') &&
                          (() => {
                            const meeting = snapshot?.meetings.find((m) => m.title === item.title)
                            return meeting ? ` · ${formatDateTime(meeting.startsAt)}` : ''
                          })()}
                        {item.kind.startsWith('due') &&
                          (() => {
                            const task = snapshot?.tasks.find((t) => t.title === item.title)
                            const label = task ? formatDueLabel(task.dueAt, now) : null
                            return label ? ` · ${label}` : ''
                          })()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
