import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong font-semibold',
  secondary: 'bg-surface-raised text-text-main border border-border-main hover:border-text-muted',
  ghost: 'bg-transparent text-text-muted hover:text-text-main hover:bg-surface-raised',
  danger: 'bg-danger text-on-danger font-semibold hover:brightness-110',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function Button({ variant = 'secondary', className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[8px] px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
