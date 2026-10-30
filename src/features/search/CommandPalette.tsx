import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorkspaceSnapshot } from '../../types/data'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import type { Route } from '../../app/router'
import { IconHome, IconMeeting, IconTasks, IconUsers } from '../../components/ui/icons'

interface Result {
  key: string
  label: string
  hint: string
  route: Route
}

/**
 * Command palette (⌘K / Ctrl+K): quick jump to any task, program, meeting, or
 * member the user is authorized to see. Selection navigates to the page.
 */
export function CommandPalette({
  open,
  onClose,
  snapshot,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  snapshot: WorkspaceSnapshot | null
  onNavigate: (route: Route) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const results = useMemo<Result[]>(() => {
    if (!snapshot) return []
    const q = query.trim().toLowerCase()
    const out: Result[] = []
    for (const task of snapshot.tasks) {
      if (out.length >= 10) break
      if (!q || task.title.toLowerCase().includes(q)) {
        out.push({ key: `t-${task.id}`, label: task.title, hint: 'Tugas', route: 'tugas' })
      }
    }
    for (const program of snapshot.programs) {
      if (out.length >= 10) break
      if (!q || program.title.toLowerCase().includes(q)) {
        out.push({ key: `p-${program.id}`, label: program.title, hint: 'Program Kerja', route: 'program' })
      }
    }
    for (const meeting of snapshot.meetings) {
      if (out.length >= 10) break
      if (!q || meeting.title.toLowerCase().includes(q)) {
        out.push({ key: `m-${meeting.id}`, label: meeting.title, hint: 'Rapat', route: 'rapat' })
      }
    }
    for (const member of snapshot.memberships) {
      if (out.length >= 10) break
      const name = snapshot.profiles[member.userId]?.displayName ?? member.userId
      if (!q || name.toLowerCase().includes(q)) {
        out.push({ key: `u-${member.userId}`, label: name, hint: 'Anggota', route: 'anggota' })
      }
    }
    return out
  }, [snapshot, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    listRef.current?.querySelectorAll('li')[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function choose(result: Result | undefined) {
    if (!result) return
    onNavigate(result.route)
    onClose()
  }

  return (
    <AccessibleDialog open={open} onClose={onClose} title="Cari cepat" variant="dialog">
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded
          aria-controls="command-palette-results"
          aria-label="Cari tugas, program, rapat, atau anggota"
          placeholder="Ketik untuk mencari…"
          className="w-full rounded-[8px] border border-border-main bg-surface-raised px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              choose(results[active])
            }
          }}
        />
        <ul id="command-palette-results" ref={listRef} className="flex max-h-72 flex-col gap-1 overflow-y-auto" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-text-muted" role="option" aria-selected={false}>
              Tidak ada hasil untuk “{query}”.
            </li>
          ) : (
            results.map((result, i) => (
              <li key={result.key} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(result)}
                  className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm ${
                    i === active ? 'bg-info/10 text-text-main' : 'hover:bg-surface-raised'
                  }`}
                >
                  {result.hint === 'Tugas' ? (
                    <IconTasks className="shrink-0 text-info" />
                  ) : result.hint === 'Program Kerja' ? (
                    <IconHome className="shrink-0 text-primary" />
                  ) : result.hint === 'Rapat' ? (
                    <IconMeeting className="shrink-0 text-info" />
                  ) : (
                    <IconUsers className="shrink-0 text-success" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{result.label}</span>
                  <span className="text-xs text-text-muted">{result.hint}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="text-xs text-text-muted">
          Gunakan ↑ ↓ untuk memilih, Enter untuk membuka, Esc untuk menutup.
        </p>
      </div>
    </AccessibleDialog>
  )
}
