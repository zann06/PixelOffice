import { useEffect, useState } from 'react'
import { dayLight, fractionalHour, phaseForHour, phaseHint, type DayPhase } from './dayCycle'

const PHASE_NAME: Record<DayPhase, string> = { pagi: 'Pagi', siang: 'Siang', sore: 'Sore', malam: 'Malam' }
const PHASE_COLOR: Record<DayPhase, string> = { pagi: '#f6c453', siang: '#7cc4f2', sore: '#f08a4b', malam: '#4a5a9a' }

/**
 * Real-time pixel clock for the sidebar: HH.MM:SS, phase label, and a 24-cell
 * day bar (one block per hour, coloured by phase, current hour blinking) so the
 * person can see at a glance why the office scene looks the way it does.
 */
export function PixelClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const hour = fractionalHour(now)
  const phase = phaseForHour(now.getHours())
  const light = dayLight(hour)
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}`

  return (
    <div
      className="border-2 border-primary-strong bg-surface p-2.5 shadow-[3px_3px_0_rgba(38,49,75,0.22)]"
      role="timer"
      aria-label={`Jam sekarang ${time}, ${PHASE_NAME[phase]}`}
    >
      <div className="flex items-end justify-between">
        <span className="pixel-label tnum text-xl leading-none text-text-main">
          {time}
          <span className="ml-1 text-xs text-text-muted">{pad(now.getSeconds())}</span>
        </span>
        <span className="pixel-label text-[10px]" style={{ color: PHASE_COLOR[phase] === '#4a5a9a' ? '#4a5a9a' : '#a8761c' }}>
          {PHASE_NAME[phase]}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px border-2 border-primary-strong bg-primary-strong" aria-hidden>
        {Array.from({ length: 24 }, (_, h) => (
          <span
            key={h}
            className={`h-3 ${h === now.getHours() ? 'live-dot' : ''}`}
            style={{
              backgroundColor: PHASE_COLOR[phaseForHour(h)],
              outline: h === now.getHours() ? '2px solid #ffffff' : undefined,
              outlineOffset: -2,
              opacity: h === now.getHours() ? 1 : 0.55,
            }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
        {phaseHint(phase)}
        {light.lamps > 0.5 ? ' · lampu 💡 menyala' : ''}
      </p>
    </div>
  )
}
