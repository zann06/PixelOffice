import { AccessibleDialog } from './AccessibleDialog'
import { Button } from './Button'

interface Props {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
}

/** Destructive actions always require explicit confirmation (docs/USER_FLOWS.md). */
export function ConfirmDialog({ open, onCancel, onConfirm, title, message, confirmLabel = 'Hapus', busy = false }: Props) {
  return (
    <AccessibleDialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Batal</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Memproses…' : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-text-muted">{message}</p>
    </AccessibleDialog>
  )
}
