import type { ReactNode } from 'react'
import { useDevNotes } from '../proto/store'

/** Yellow annotation for developers. Hidden unless Dev → "Show dev notes" is on. */
export function DevNote({ children, className = '', always = false }: { children: ReactNode; className?: string; always?: boolean }) {
  const on = useDevNotes()
  if (!on && !always) return null
  return (
    <aside
      className={`rounded-lg border border-devnote-border bg-devnote px-3 py-2 text-xs leading-relaxed text-devnote-ink ${className}`}
      aria-label="Developer note"
    >
      {children}
    </aside>
  )
}

export type BadgeKind = 'proposed' | 'needs decision' | 'proposed — not in PRD' | 'new' | 'not built'

/** Small annotation badge ("proposed", "needs decision", …). Dev notes only. */
export function Badge({ kind, always = false }: { kind: BadgeKind; always?: boolean }) {
  const on = useDevNotes()
  if (!on && !always) return null
  return (
    <span className="ml-1.5 inline-block whitespace-nowrap rounded bg-devnote-badge px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-devnote-ink">
      {kind}
    </span>
  )
}
