import { PixelSelect } from './PixelSelect'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string | null
  hint?: string
  children: ReactNode
}

/** Form field with label, hint, and error associated for assistive tech. */
export function FormField({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const controlClass =
  'w-full rounded-[8px] border border-border-main bg-surface-raised px-3 py-2 text-sm text-text-main placeholder:text-text-muted/60 focus-visible:border-info disabled:opacity-50'

export function TextInput({ invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={`${controlClass} ${invalid ? 'border-danger' : ''}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export function TextArea({ invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={`${controlClass} min-h-20 ${invalid ? 'border-danger' : ''}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <PixelSelect className={controlClass} {...props}>
      {children}
    </PixelSelect>
  )
}

export function Avatar({ name, color }: { name: string; color?: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: color ?? '#75e0b3' }}
    >
      {initials}
    </span>
  )
}
