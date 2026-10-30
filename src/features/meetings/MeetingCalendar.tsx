import type { Meeting } from '../../types/data'
import { Button } from '../../components/ui/Button'

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

/** Month-grid calendar; clicking a meeting chip opens its detail. */
export function MeetingCalendar({
  meetings,
  onSelect,
  monthCursor,
  setMonthCursor,
}: {
  meetings: Meeting[]
  onSelect: (id: string) => void
  monthCursor: Date
  setMonthCursor: (d: Date) => void
}) {
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday-first offset
  const leading = (first.getDay() + 6) % 7
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const byDay = new Map<number, Meeting[]>()
  for (const meeting of meetings) {
    const start = new Date(meeting.startsAt)
    if (start.getFullYear() === year && start.getMonth() === month) {
      const list = byDay.get(start.getDate()) ?? []
      list.push(meeting)
      byDay.set(start.getDate(), list)
    }
  }
  const today = new Date()
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <section aria-label="Kalender rapat" className="fade-up rounded-[12px] border border-border-main bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {monthCursor.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
        </p>
        <div className="flex items-center gap-1">
          <Button aria-label="Bulan sebelumnya" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}>
            ‹
          </Button>
          <Button onClick={() => setMonthCursor(new Date())}>Hari ini</Button>
          <Button aria-label="Bulan berikutnya" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}>
            ›
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-text-muted">
        {DAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />
          const dayMeetings = byDay.get(day) ?? []
          const isToday = isThisMonth && day === today.getDate()
          return (
            <div
              key={day}
              className={`min-h-20 rounded-[8px] border p-1 ${isToday ? 'border-info' : 'border-border-main'} bg-surface-raised`}
            >
              <span className={`text-xs tnum ${isToday ? 'font-bold text-info' : 'text-text-muted'}`}>{day}</span>
              <ul className="mt-0.5 flex flex-col gap-0.5">
                {dayMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(meeting.id)}
                      className="w-full truncate rounded-[4px] bg-info/10 px-1 py-0.5 text-left text-[10px] text-info hover:bg-info/20"
                      aria-label={`Buka rapat ${meeting.title}`}
                    >
                      {meeting.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
