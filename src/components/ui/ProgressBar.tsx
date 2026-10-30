import type { ProgramProgress } from '../../lib/progress'

interface Props {
  progress: ProgramProgress
  size?: 'sm' | 'md'
  showLabel?: boolean
}

/**
 * Progress bar. A null percent (no non-cancelled tasks) renders an explicit
 * empty state — we never invent a number (docs/PRD.md §8).
 */
export function ProgressBar({ progress, size = 'md', showLabel = true }: Props) {
  const bar = size === 'sm' ? 'pixel-progress !h-2.5' : 'pixel-progress'
  if (progress.percent === null) {
    return (
      <div className="w-full">
        <div className={`w-full ${bar}`} />
        {showLabel && <p className="mt-1 text-xs text-text-muted">Belum ada tugas</p>}
      </div>
    )
  }
  return (
    <div className="w-full">
      <div
        className={`w-full ${bar}`}
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progres ${progress.percent}% (${progress.done} dari ${progress.total} tugas selesai)`}
      >
        <span style={{ ['--p' as string]: progress.percent / 100 }} />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-text-muted tnum">
          {progress.percent}% · {progress.done}/{progress.total} tugas selesai
        </p>
      )}
    </div>
  )
}
