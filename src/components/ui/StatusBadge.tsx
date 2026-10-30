import type { ProgramStatus, TaskStatus } from '../../types/data'
import { IconAlert, IconCheck, IconClock, IconPause, IconPlay, IconTasks } from './icons'

/**
 * Status badges always include TEXT (never color alone — docs/DESIGN_SYSTEM.md
 * §6). Colors and icons are supplemental.
 */

const PROGRAM_LABELS: Record<ProgramStatus, { label: string; className: string; icon: typeof IconPlay }> = {
  planned: { label: 'Direncanakan', className: 'border-info/60 text-info bg-info/10', icon: IconClock },
  active: { label: 'Berjalan', className: 'border-primary-strong/60 text-primary bg-primary/10', icon: IconPlay },
  blocked: { label: 'Terhambat', className: 'border-danger/60 text-danger bg-danger/10', icon: IconAlert },
  completed: { label: 'Selesai', className: 'border-success/60 text-success bg-success/10', icon: IconCheck },
  archived: { label: 'Diarsipkan', className: 'border-border-main text-text-muted bg-surface', icon: IconTasks },
}

const TASK_LABELS: Record<TaskStatus, { label: string; className: string; icon: typeof IconPlay }> = {
  todo: { label: 'Belum dikerjakan', className: 'border-border-main text-text-muted bg-surface', icon: IconTasks },
  in_progress: { label: 'Dikerjakan', className: 'border-info/60 text-info bg-info/10', icon: IconPlay },
  blocked: { label: 'Terhambat', className: 'border-danger/60 text-danger bg-danger/10', icon: IconAlert },
  in_review: { label: 'Menunggu review', className: 'border-warning/60 text-warning bg-warning/10', icon: IconClock },
  done: { label: 'Selesai', className: 'border-success/60 text-success bg-success/10', icon: IconCheck },
  cancelled: { label: 'Dibatalkan', className: 'border-border-main text-text-muted bg-surface line-through decoration-1', icon: IconPause },
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  owner: { label: 'Pemilik', className: 'border-primary-strong/60 text-primary bg-primary/10' },
  admin: { label: 'Admin', className: 'border-info/60 text-info bg-info/10' },
  lead: { label: 'Ketua Divisi', className: 'border-warning/60 text-warning bg-warning/10' },
  member: { label: 'Anggota', className: 'border-border-main text-text-muted bg-surface' },
  viewer: { label: 'Pengamat', className: 'border-border-main text-text-muted bg-surface' },
}

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>
      {children}
    </span>
  )
}

export function ProgramStatusBadge({ status }: { status: ProgramStatus }) {
  const def = PROGRAM_LABELS[status]
  const Icon = def.icon
  return (
    <Badge className={def.className}>
      <Icon width={11} height={11} /> {def.label}
    </Badge>
  )
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const def = TASK_LABELS[status]
  const Icon = def.icon
  return (
    <Badge className={def.className}>
      <Icon width={11} height={11} /> {def.label}
    </Badge>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const def = ROLE_LABELS[role] ?? { label: 'Anggota', className: 'border-border-main text-text-muted bg-surface' }
  return <Badge className={def.className}>{def.label}</Badge>
}

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(TASK_LABELS) as TaskStatus[]
).map((value) => ({ value, label: TASK_LABELS[value].label }))
