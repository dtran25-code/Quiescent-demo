import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Trash2, X } from 'lucide-react'
import { QTurtle } from '../icons/QTurtle'
import { ConfirmDialog } from '../components/Modal'
import { updateHighlights } from '../storage/db'
import type { Highlight } from '../types'
import { track } from '../events/track'

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
  onAskQ,
}: {
  highlight: Highlight
  x: number
  y: number
  onClose: () => void
  /** Point Q at this highlight, with the note as currently typed. Left out while Q is off. */
  onAskQ?: (note: string) => void
}) {
  const [text, setText] = useState(highlight.note)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const box = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)
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

  // Save anything still waiting when the window closes, and log one note_edited
  // per note window (length only; never the note text).
  const latest = useRef(highlight.note)
  const removed = useRef(false)
  useEffect(() => {
    latest.current = text
  }, [text])
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (pending.current !== null) save(pending.current)
      if (!removed.current && latest.current !== highlight.note)
        track('note_edited', { item_id: highlight.itemId, highlight_id: highlight.id, length: latest.current.length })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Close when clicking anywhere else (but not while the delete confirm is open).
  useEffect(() => {
    if (confirming) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose, confirming])

  function remove() {
    window.clearTimeout(timer.current)
    pending.current = null
    removed.current = true
    updateHighlights(highlight.itemId, (list) => list.filter((h) => h.id !== highlight.id))
    track('highlight_deleted', { item_id: highlight.itemId, highlight_id: highlight.id, had_note: !!text.trim() })
    onClose()
  }

  // A highlight with a note asks first; one without a note goes straight away.
  const askRemove = () => (text.trim() ? setConfirming(true) : remove())

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Note"
      className="absolute z-30 w-[22rem] rounded-xl bg-card font-sans shadow-xl ring-1 ring-rule"
      style={{ left: x, top: y }}
    >
      <div className="border-b border-rule px-4 py-2.5">
        <p className="line-clamp-2 text-sm italic leading-snug text-ink-soft">“{highlight.quote}”</p>
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
        <button onClick={askRemove} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-soft hover:bg-accent-soft hover:text-accent">
          <Trash2 size={13} /> Remove highlight
        </button>
        <div className="flex items-center gap-2">
          {onAskQ && (
            <button
              onClick={() => onAskQ(text)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft"
              title="Ask Q about this highlight"
            >
              <QTurtle size={16} /> Ask Q!
            </button>
          )}
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
      {/* On the page body, so the highlights panel and Q can't sit on top of it. */}
      {confirming &&
        createPortal(
          <ConfirmDialog
            title="Delete highlight and note?"
            message="The highlighted passage and your note on it will be removed."
            confirmLabel="Delete"
            onCancel={() => setConfirming(false)}
            onConfirm={remove}
          />,
          document.body,
        )}
    </div>
  )
}
