import type { ReactNode } from 'react'
import { IconAlert } from './icons'

/** 12×10 pixel "empty crate" drawn with SVG rects (crisp at any zoom). */
function PixelBox() {
  const rows = ['..bbbbbbbb..', '.bttttttttb.', 'bttttttttttb', 'bsssssssssb.', 'bsddddddddsb', 'bsdhhhhhhdsb', 'bsdhhhhhhdsb', 'bsddddddddsb', 'bsssssssssb.', '.bbbbbbbbbb.']
  const fill: Record<string, string> = { b: '#26314b', t: '#e0b07c', s: '#c08a5c', d: '#a5754a', h: '#8a5f3c' }
  return (
    <svg width="48" height="40" viewBox="0 0 12 10" shapeRendering="crispEdges" aria-hidden className="mb-1">
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill[c]} />)),
      )}
    </svg>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[12px] border-2 border-dashed border-border-main bg-surface px-6 py-10 text-center">
      <PixelBox />
      <span className="pixel-label text-xs text-text-muted">KOSONG</span>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-muted">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ title, description, onRetry }: { title: string; description?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-[12px] border border-danger/50 bg-danger/10 px-4 py-4">
      <p className="flex items-center gap-2 font-medium text-danger">
        <IconAlert /> {title}
      </p>
      {description && <p className="text-sm text-text-muted">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm font-medium text-info underline underline-offset-2">
          Coba lagi
        </button>
      )}
    </div>
  )
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-12 rounded-[8px] bg-surface-raised" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

export function PermissionDenied({ message = 'Anda tidak memiliki izin untuk melakukan aksi ini.' }: { message?: string }) {
  return (
    <p className="flex items-center gap-2 rounded-[8px] border border-border-main bg-surface px-3 py-2 text-xs text-text-muted">
      <IconAlert width={12} height={12} /> {message}
    </p>
  )
}
