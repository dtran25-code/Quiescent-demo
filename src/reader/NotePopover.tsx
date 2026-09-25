import { useEffect, useRef, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { updateHighlights } from '../storage/db'
import type { Highlight } from '../types'

const SAVE_DELAY = 400

/**
 * Small note window anchored under a highlighted passage. Autosaves as you type.
 * Positioned inside the scrolling content, so it moves with the text.
 */
export function NotePopover({
  highlight,
  x,
  y,
  onClose,
}: {
  highlight: Highlight
  x: number
  y: number
  onClose: () => void
}) {
  const [text, setText] = useState(highlight.note)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const box = useRef<HTMLDivElement>(null)
  const pending = useRef<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const save = (value: string) =>
    updateHighlights(highlight.itemId, (list) =>
      list.map((h) => (h.id === highlight.id ? { ...h, note: value, updatedAt: Date.now() } : h)),
    )

  function onChange(value: string) {
    setText(value)
    setStatus('saving')
    pending.current = value
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      pending.current = null
      await save(value)
      setStatus('saved')
    }, SAVE_DELAY)
  }

  // Save anything still waiting when the window closes.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (pending.current !== null) save(pending.current)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Close when clicking anywhere else.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  function remove() {
    window.clearTimeout(timer.current)
    pending.current = null
    updateHighlights(highlight.itemId, (list) => list.filter((h) => h.id !== highlight.id))
    onClose()
  }

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Note"
      className="absolute z-30 w-[22rem] rounded-xl bg-white font-sans shadow-xl ring-1 ring-rule"
      style={{ left: x, top: y }}
    >
      <div className="border-b border-rule px-4 py-2.5">
        <p className="line-clamp-2 font-serif text-sm italic leading-snug text-ink-soft">“{highlight.quote}”</p>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
        placeholder="Write a quick note…"
        rows={4}
        className="block w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
      />
      <div className="flex items-center justify-between border-t border-rule px-2 py-1.5">
        <button onClick={remove} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-soft hover:bg-accent-soft hover:text-accent">
          <Trash2 size={13} /> Remove highlight
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-faint" aria-live="polite">
            {status === 'saving' ? 'Saving…' : status === 'saved' ? (
              <span className="inline-flex items-center gap-1"><Check size={12} /> Saved</span>
            ) : null}
          </span>
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-paper-deep" aria-label="Close note">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
