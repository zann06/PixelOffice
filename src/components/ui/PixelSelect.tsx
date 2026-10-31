import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'

interface Opt {
  value: string
  label: ReactNode
  text: string
  disabled: boolean
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

/** Collect <option> children (also inside fragments / arrays) into plain data. */
function collect(children: ReactNode, out: Opt[] = []): Opt[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const el = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>
    if (el.type === Fragment) {
      collect(el.props.children, out)
    } else if (el.type === 'option') {
      const text = textOf(el.props.children)
      out.push({
        value: el.props.value !== undefined ? String(el.props.value) : text,
        label: el.props.children,
        text,
        disabled: Boolean(el.props.disabled),
      })
    }
  })
  return out
}

/**
 * Pixel-styled dropdown — a drop-in replacement for <select> (same props,
 * same <option> children, same onChange(e.target.value) shape). The native
 * popup cannot be styled, so this renders its own listbox with full keyboard
 * support: ↑/↓/Home/End to move, Enter/Space to pick, Esc to close, and
 * type-ahead by first letter.
 *
 * The open listbox renders through a PORTAL with fixed positioning anchored
 * to the trigger, so it is never clipped by scrollable/overflow-hidden
 * containers (sidebar, dialogs, table cells). It flips upward when there is
 * no room below and is clamped to the viewport.
 */
export function PixelSelect({
  children,
  className = '',
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  name,
  required,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = useMemo(() => collect(children), [children])
  const autoId = useId()
  const listId = `${id ?? autoId}-list`
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [inner, setInner] = useState(String(defaultValue ?? options[0]?.value ?? ''))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null)

  const current = value !== undefined ? String(value) : inner
  const selected = options.find((o) => o.value === current) ?? options[0]
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === selected?.value))

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!wrapRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active])

  // Anchor the portal listbox to the trigger; flip up and clamp to viewport.
  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = wrapRef.current?.getBoundingClientRect()
      const panel = listRef.current
      if (!rect || !panel) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = panel.offsetWidth
      const h = panel.offsetHeight
      let top = rect.bottom + 4
      if (top + h > vh - 8 && rect.top - h - 4 > 8) top = rect.top - h - 4
      top = Math.max(8, Math.min(top, vh - h - 8))
      const left = Math.max(8, Math.min(rect.left, vw - w - 8))
      setPos({ top, left, minWidth: rect.width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, options])

  function openList() {
    if (disabled) return
    setActive(selectedIndex)
    setOpen(true)
  }

  function pick(index: number) {
    const opt = options[index]
    if (!opt || opt.disabled) return
    setInner(opt.value)
    setOpen(false)
    const target = { value: opt.value, name: name ?? '' }
    onChange?.({ target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement>)
  }

  function move(from: number, step: 1 | -1): number {
    let i = from
    for (let n = 0; n < options.length; n++) {
      i = (i + step + options.length) % options.length
      if (!options[i]?.disabled) return i
    }
    return from
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => move(a, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => move(a, -1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(move(-1, 1))
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(move(options.length, -1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(active)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false)
    }
    else if (e.key.length === 1) {
      const idx = options.findIndex((o, i) => i > active && !o.disabled && o.text.toLowerCase().startsWith(e.key.toLowerCase()))
      const wrap = idx >= 0 ? idx : options.findIndex((o) => !o.disabled && o.text.toLowerCase().startsWith(e.key.toLowerCase()))
      if (wrap >= 0) setActive(wrap)
    }
  }

  const block = /\bw-full\b/.test(className)
  return (
    <div ref={wrapRef} className={`relative ${block ? 'block w-full' : 'inline-block'}`}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={rest['aria-label']}
        aria-labelledby={rest['aria-labelledby']}
        aria-describedby={rest['aria-describedby']}
        aria-invalid={rest['aria-invalid']}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`${className} pixel-select-trigger flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="truncate">{selected?.label}</span>
        <svg width="10" height="6" viewBox="0 0 5 3" shapeRendering="crispEdges" aria-hidden className="shrink-0">
          <path d="M0 0h5v1H4v1H3v1H2V2H1V1H0z" fill="currentColor" />
        </svg>
      </button>
      {name && <input type="hidden" name={name} value={current} required={required} />}
      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="pixel-select-list scroll-slim fixed z-[60] max-h-60 overflow-auto"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, minWidth: pos?.minWidth ?? undefined, width: 'max-content', maxWidth: Math.min(420, (typeof window !== 'undefined' ? window.innerWidth : 640) - 16) }}
          >
            {options.map((o, i) => (
              <li
                key={`${o.value}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === selected?.value}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
                className={`pixel-select-item ${i === active ? 'is-active' : ''} ${o.value === selected?.value ? 'is-selected' : ''} ${o.disabled ? 'is-disabled' : ''}`}
              >
                <span className="pixel-select-mark" aria-hidden>
                  {o.value === selected?.value ? '▶' : ''}
                </span>
                <span className="truncate">{o.label}</span>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}
