import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog: Esc or the ✕ closes it, focus moves inside on open (to [autofocus] or
 * the first control), Tab stays inside, and focus returns to the opener on close.
 */
export function Modal({
  title,
  onClose,
  children,
  width = 'max-w-md',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  // Captured during the first render, before any autoFocus moves focus inside.
  const [opener] = useState(() => document.activeElement as HTMLElement | null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])

  useEffect(() => {
    const el = box.current
    // Skip the ✕ (first control) unless it's the only one.
    const controls = el ? [...el.querySelectorAll<HTMLElement>(FOCUSABLE)] : []
    const first = el?.querySelector<HTMLElement>('[autofocus], [data-autofocus]') ?? controls[1] ?? controls[0]
    // React's autoFocus may already have placed focus inside; keep it.
    if (!el?.contains(document.activeElement)) first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close.current()
      }
      if (e.key === 'Tab' && el) {
        const all = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)]
        if (!all.length) return
        const [a, z] = [all[0], all[all.length - 1]]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      opener?.focus?.()
    }
  }, [opener])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[calc(100vh-3rem)] w-full flex-col ${width} rounded-xl bg-paper shadow-xl ring-1 ring-rule`}
      >
        <div className="flex items-center justify-between border-b border-rule px-6 py-4">
          <h2 className="font-serif text-2xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-ink-soft hover:bg-paper-deep" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="text-ink-soft">{message}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button onClick={onConfirm} className="btn-primary" data-autofocus>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
