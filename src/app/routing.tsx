import type { ReactNode } from 'react'
import { useRoute, type Route } from './router'

/** Hash-based link: real anchor element, works with middle-click and screen readers. */
export function Link({
  to,
  className,
  children,
  onClick,
  ...rest
}: {
  to: Route
  className?: string
  children: ReactNode
  onClick?: () => void
  'aria-current'?: 'page' | undefined
}) {
  return (
    <a href={`#/${to}`} className={className} onClick={onClick} aria-current={rest['aria-current']}>
      {children}
    </a>
  )
}

export { useRoute }
