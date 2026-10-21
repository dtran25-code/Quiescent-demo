// A small accessible menu button (WAI-ARIA menu pattern): Enter/Space/↓ opens
// and focuses the first item, ↑/↓/Home/End move, Esc closes and returns focus,
// Tab or a click outside closes.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export type MenuEntry =
  | { kind?: 'item'; label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean }
  | { kind: 'radio'; label: string; checked: boolean; onSelect: () => void }
  | { kind: 'heading'; label: string }
  | { kind: 'separator' }

export function Menu({ label, icon, entries, className = '' }: { label: string; icon: ReactNode; entries: MenuEntry[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const id = useId()

  const items = () => [...(list.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])]
  const focusAt = (i: number) => {
    const all = items()
    all[(i + all.length) % all.length]?.focus()
  }

  useEffect(() => {
    if (!open) return
    focusAt(0)
    const onDown = (e: MouseEvent) => {
      if (!list.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function onKey(e: React.KeyboardEvent) {
    const all = items()
    const i = all.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') focusAt(i + 1)
    else if (e.key === 'ArrowUp') focusAt(i - 1)
    else if (e.key === 'Home') focusAt(0)
    else if (e.key === 'End') focusAt(all.length - 1)
    else if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      button.current?.focus()
    } else if (e.key === 'Tab') setOpen(false)
    else return
    e.preventDefault()
  }

  const choose = (fn: () => void) => {
    setOpen(false)
    button.current?.focus()
    fn()
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
      >
        {icon}
      </button>
      {open && (
        <div
          ref={list}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKey}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl bg-card py-1.5 shadow-xl ring-1 ring-rule"
        >
          {entries.map((entry, i) => {
            if (entry.kind === 'separator') return <div key={i} role="separator" className="my-1.5 h-px bg-rule" />
            if (entry.kind === 'heading')
              return (
                <div key={i} className="eyebrow px-3.5 pb-1 pt-1.5" role="presentation">
                  {entry.label}
                </div>
              )
            if (entry.kind === 'radio')
              return (
                <button
                  key={i}
                  type="button"
                  role="menuitemradio"
                  aria-checked={entry.checked}
                  tabIndex={-1}
                  onClick={() => choose(entry.onSelect)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-sm text-ink hover:bg-paper-deep focus:bg-paper-deep focus:outline-none"
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${entry.checked ? 'border-accent' : 'border-ink-faint'}`}
                    aria-hidden="true"
                  >
                    {entry.checked && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  </span>
                  {entry.label}
                </button>
              )
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => choose(entry.onSelect)}
                className={`flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-sm hover:bg-paper-deep focus:bg-paper-deep focus:outline-none ${
                  entry.danger ? 'text-danger' : 'text-ink'
                }`}
              >
                {entry.icon}
                {entry.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
