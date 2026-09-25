import { useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { ArrowUpRight, Check, Pencil, Sparkles, StickyNote, X } from 'lucide-react'
import { updateHighlights } from '../../storage/db'
import type { Highlight } from '../../types'
import { useNotesContext } from './NotesContext'

/**
 * How a highlight card looks on the Notes page. Clicking the card opens the
 * Reading View at that passage; the small buttons edit the note, ask the AI,
 * or remove the card from the page (the highlight itself stays).
 */
export function HighlightCardView({ node, deleteNode, selected }: ReactNodeViewProps) {
  const { item, highlights, onGo, onAskAI } = useNotesContext()
  const h = highlights.get(node.attrs.highlightId as string)
  const [editing, setEditing] = useState(false)

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  if (!h) {
    return (
      <NodeViewWrapper className="my-4" contentEditable={false}>
        <div className="flex items-center justify-between rounded-xl border border-dashed border-rule px-5 py-3 font-sans text-sm text-ink-faint">
          This highlight was removed in the Reading View.
          <CardButton label="Remove from page" onClick={deleteNode}>
            <X size={14} />
          </CardButton>
        </div>
      </NodeViewWrapper>
    )
  }

  const hasNote = h.note.trim().length > 0
  return (
    <NodeViewWrapper className="my-4" contentEditable={false}>
      <div
        role="link"
        tabIndex={0}
        onClick={() => !editing && onGo(h)}
        onKeyDown={(e) => e.key === 'Enter' && !editing && onGo(h)}
        title={editing ? undefined : 'Open this passage in the Reading View'}
        className={`group rounded-xl bg-paper px-5 py-4 font-sans ring-1 transition-shadow ${
          editing ? 'ring-accent/40' : 'cursor-pointer ring-rule hover:shadow-md hover:ring-accent/40'
        } ${selected ? 'ring-2 ring-accent/50' : ''}`}
      >
        {editing ? (
          <NoteEditor highlight={h} onDone={() => setEditing(false)} />
        ) : hasNote ? (
          <p className="flex gap-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
            <StickyNote size={15} className="mt-1 shrink-0 text-accent" />
            <span>{h.note}</span>
          </p>
        ) : null}

        <blockquote className={`${editing || hasNote ? 'mt-3' : ''} border-l-2 border-accent/40 pl-3 font-serif text-[15px] italic leading-relaxed text-ink-soft`}>
          “{h.quote}”
        </blockquote>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-accent">
            Go to passage <ArrowUpRight size={13} />
          </span>
          {h.page && <span className="text-ink-faint">Page {h.page}</span>}
          {!h.page && item.type === 'article' && (
            <span className="text-ink-faint">{item.chapters.find((c) => c.id === h.chapterId)?.title}</span>
          )}
          <div className="ml-auto flex items-center gap-0.5 opacity-50 transition-opacity group-hover:opacity-100" onClick={stop}>
            {!editing && (
              <CardButton label={hasNote ? 'Edit note' : 'Add a note'} onClick={() => setEditing(true)}>
                <Pencil size={14} />
              </CardButton>
            )}
            <CardButton label="Ask AI about this" onClick={() => onAskAI(h)}>
              <Sparkles size={14} />
            </CardButton>
            <CardButton label="Remove from page (the highlight stays in the Reading View)" onClick={deleteNode}>
              <X size={14} />
            </CardButton>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

function CardButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        props.onClick()
      }}
      title={props.label}
      aria-label={props.label}
      className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-accent-soft hover:text-accent"
    >
      {props.children}
    </button>
  )
}

/** Edit the highlight's note in place; autosaves, and the Reading View sees it too. */
function NoteEditor({ highlight, onDone }: { highlight: Highlight; onDone: () => void }) {
  const [text, setText] = useState(highlight.note)
  const [saved, setSaved] = useState(true)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<string | null>(null)

  const save = (value: string) =>
    updateHighlights(highlight.itemId, (l) => l.map((x) => (x.id === highlight.id ? { ...x, note: value, updatedAt: Date.now() } : x)))

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (pending.current !== null) save(pending.current)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <textarea
        autoFocus
        value={text}
        rows={3}
        onChange={(e) => {
          const v = e.target.value
          setText(v)
          setSaved(false)
          pending.current = v
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(async () => {
            pending.current = null
            await save(v)
            setSaved(true)
          }, 400)
        }}
        onKeyDown={(e) => e.key === 'Escape' && onDone()}
        placeholder="Write a note about this passage…"
        className="field resize-y text-[15px] leading-relaxed"
      />
      <div className="mt-2 flex items-center justify-end gap-3">
        <span className="text-xs text-ink-faint">{saved ? 'Saved' : 'Saving…'}</span>
        <button type="button" onClick={onDone} className="btn-primary px-3 py-1 text-xs">
          <Check size={13} /> Done
        </button>
      </div>
    </div>
  )
}
