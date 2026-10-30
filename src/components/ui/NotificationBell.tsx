import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../app/store'
import { buildNotifications } from '../../lib/notifications'
import { formatDueLabel, formatDateTime } from '../../lib/format'
import { Link } from '../../app/routing'
import { IconClose } from './icons'

/**
 * In-app notification center: overdue tasks, due today/tomorrow, and upcoming
 * meetings — derived purely from the same saved snapshot the rest of the app
 * reads (no push backend). Opens below the bell button.
 */
export function NotificationBell() {
  const { snapshot } = useApp()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const items = snapshot ? buildNotifications(snapshot.tasks, snapshot.meetings, now) : []
  const overdue = items.filter((i) => i.kind === 'overdue').length

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Notifikasi (${items.length} item)`}
        className="flex w-full items-center gap-2 rounded-[8px] border border-border-main bg-surface-raised px-3 py-2 text-sm text-text-muted hover:text-text-main"
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

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-80 rounded-[12px] border border-border-main bg-surface p-2 shadow-2xl"
          role="dialog"
          aria-label="Pusat notifikasi"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Notifikasi</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
                    <span
                      className={`block text-xs ${
                        item.kind === 'overdue' ? 'text-danger' : 'text-text-muted'
                      }`}
                    >
                      {item.detail}
                      {item.kind.startsWith('meeting') && snapshot
                        ? (() => {
                            const meeting = snapshot.meetings.find((m) => m.title === item.title)
                            return meeting ? ` · ${formatDateTime(meeting.startsAt)}` : ''
                          })()
                        : item.kind.startsWith('due')
                          ? (() => {
                              const task = snapshot?.tasks.find((t) => t.title === item.title)
                              const label = task ? formatDueLabel(task.dueAt, now) : null
                              return label ? ` · ${label}` : ''
                            })()
                          : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
