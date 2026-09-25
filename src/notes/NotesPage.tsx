import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronDown, Pencil, Sparkles, StickyNote, Trash2 } from 'lucide-react'
import { updateHighlights, useHighlights, useItem } from '../storage/db'
import type { Highlight, Item } from '../types'
import { byReadingOrder } from '../reader/anchors'
import { ConfirmDialog } from '../components/Modal'
import { Assistant, AssistantToggle } from '../ai/Assistant'
import type { Attachment } from '../ai/types'

const UNDO_SECONDS = 10

export function NotesPage() {
  const { id } = useParams()
  const item = useItem(id)
  if (item === undefined) return null
  if (item === null) {
    return (
      <div className="mx-auto max-w-xl px-8 py-24 text-center">
        <p className="font-serif text-2xl">This item isn't in your library.</p>
        <Link to="/library" className="btn-primary mt-6">
          Back to library
        </Link>
      </div>
    )
  }
  return <Notes key={item.id} item={item} />
}

interface Undo {
  message: string
  /** The highlights to put back. */
  restore: Highlight[]
}

function Notes({ item }: { item: Item }) {
  const navigate = useNavigate()
  const highlights = useHighlights(item.id)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [undo, setUndo] = useState<Undo | null>(null)
  // Assistant context: the chapter you're working in and anything you pointed it at.
  const [focusChapter, setFocusChapter] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [openSignal, setOpenSignal] = useState(0)

  const list = [...(highlights ?? [])].sort(byReadingOrder)
  const groups = item.chapters
    .map((chapter) => ({ chapter, items: list.filter((h) => h.chapterId === chapter.id) }))
    .filter((g) => g.items.length > 0)
  const noteCount = list.filter((h) => h.note.trim()).length
  const titled = groups.filter((g) => g.chapter.title).length
  const unit = item.type === 'pdf' ? 'chapter' : 'section'
  // Cards line up under section headers; with no headers at all they sit flush left.
  const indent = titled > 0 ? 'pl-9' : ''
  const chapterId = focusChapter ?? groups[0]?.chapter.id ?? item.chapters[0].id

  function toggle(chapterId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)
      return next
    })
  }

  function remove(h: Highlight) {
    updateHighlights(item.id, (l) => l.filter((x) => x.id !== h.id))
    setUndo({ message: h.note.trim() ? 'Note deleted.' : 'Highlight deleted.', restore: [h] })
  }

  function clearAll() {
    const snapshot = list
    updateHighlights(item.id, () => [])
    setConfirmClear(false)
    setEditing(null)
    setUndo({ message: `Cleared ${snapshot.length} ${snapshot.length === 1 ? 'highlight' : 'highlights and notes'}.`, restore: snapshot })
  }

  function restore(u: Undo) {
    updateHighlights(item.id, (l) => {
      const ids = new Set(l.map((h) => h.id))
      return [...l, ...u.restore.filter((h) => !ids.has(h.id))]
    })
    setUndo(null)
  }

  function askAI(h: Highlight) {
    setFocusChapter(h.chapterId)
    setAttachment({ kind: 'note', text: h.quote, note: h.note, highlightId: h.id, chapterId: h.chapterId })
    setOpenSignal((n) => n + 1)
  }

  return (
    <div className="mx-auto max-w-3xl px-8 pb-32 pt-10">
      <header className="border-b border-rule pb-6">
        <div className="flex items-center justify-between">
          <Link to="/library" className="btn-ghost -ml-4">
            <ArrowLeft size={16} /> Library
          </Link>
          <div className="flex items-center gap-1">
            <AssistantToggle />
            <Link to={`/read/${item.id}`} className="btn-ghost">
              <BookOpen size={16} /> Read
            </Link>
          </div>
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-accent">Notes</p>
        <h1 className="mt-1 font-serif text-3xl leading-tight">{item.title}</h1>
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-soft">
            {list.length} {list.length === 1 ? 'highlight' : 'highlights'} · {noteCount} {noteCount === 1 ? 'note' : 'notes'}
            {titled > 0 && ` · ${titled} ${titled === 1 ? unit : `${unit}s`}`}
          </p>
          <button
            onClick={() => setConfirmClear(true)}
            disabled={list.length === 0}
            className="btn-ghost text-xs disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 size={14} /> Clear all notes
          </button>
        </div>
      </header>

      {highlights !== undefined && groups.length === 0 && (
        <div className="py-20 text-center">
          <p className="font-serif text-xl">A blank page.</p>
          <p className="mt-2 text-sm text-ink-soft">
            Highlight passages while reading and your notes will collect here{item.type === 'pdf' ? ', by chapter' : ''}.
          </p>
          <Link to={`/read/${item.id}`} className="btn-primary mt-6">
            <BookOpen size={16} /> Start reading
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {groups.map(({ chapter, items }) => {
          // An article's opening section has no title, so its notes show without a header.
          const isOpen = !chapter.title || !collapsed.has(chapter.id)
          return (
            <section key={chapter.id}>
              {chapter.title && (
                <button
                  onClick={() => toggle(chapter.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-paper-deep"
                >
                  <ChevronDown size={16} className={`shrink-0 text-ink-faint transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                  <h2 className="flex-1 font-serif text-lg">{chapter.title}</h2>
                  {chapter.startPage && (
                    <span className="text-xs text-ink-faint">
                      {chapter.startPage === chapter.endPage ? `p. ${chapter.startPage}` : `pp. ${chapter.startPage}–${chapter.endPage}`}
                    </span>
                  )}
                  <span className="rounded-full bg-paper-deep px-2 py-0.5 text-xs tabular-nums text-ink-soft">{items.length}</span>
                </button>
              )}
              {isOpen && (
                <ul className={`space-y-3 ${chapter.title ? 'mt-2' : ''} ${indent}`}>
                  {items.map((h) => (
                    <NoteCard
                      key={h.id}
                      highlight={h}
                      editing={editing === h.id}
                      onEdit={() => {
                        setEditing(h.id)
                        setFocusChapter(h.chapterId)
                      }}
                      onDone={() => setEditing(null)}
                      onGo={() => navigate(`/read/${item.id}?hl=${h.id}`)}
                      onDelete={() => remove(h)}
                      onAskAI={() => askAI(h)}
                    />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="Clear all notes?"
          message={
            <>
              This removes all {list.length} highlights and notes for this item, including the highlights in the Reading View. You'll
              have {UNDO_SECONDS} seconds to undo.
            </>
          }
          confirmLabel="Clear all"
          onCancel={() => setConfirmClear(false)}
          onConfirm={clearAll}
        />
      )}

      {undo && <UndoToast key={undo.message + undo.restore.length} undo={undo} onUndo={() => restore(undo)} onExpire={() => setUndo(null)} />}

      <Assistant
        item={item}
        highlights={highlights ?? []}
        chapterId={chapterId}
        attachment={attachment}
        onClearAttachment={() => setAttachment(null)}
        openSignal={openSignal}
      />
    </div>
  )
}

// --- one highlight + note ----------------------------------------------------------

function NoteCard({
  highlight: h,
  editing,
  onEdit,
  onDone,
  onGo,
  onDelete,
  onAskAI,
}: {
  highlight: Highlight
  editing: boolean
  onEdit: () => void
  onDone: () => void
  onGo: () => void
  onDelete: () => void
  onAskAI: () => void
}) {
  const hasNote = h.note.trim().length > 0
  return (
    <li className="group rounded-xl bg-white/70 px-5 py-4 ring-1 ring-rule transition-shadow hover:shadow-sm">
      {editing ? (
        <NoteEditor highlight={h} onDone={onDone} />
      ) : hasNote ? (
        <p className="flex gap-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
          <StickyNote size={15} className="mt-1 shrink-0 text-accent" />
          <span>{h.note}</span>
        </p>
      ) : (
        <button onClick={onEdit} className="text-sm text-ink-faint hover:text-accent">
          + Add a note
        </button>
      )}

      <blockquote className="mt-3 border-l-2 border-accent/40 pl-3 font-serif text-[15px] italic leading-relaxed text-ink-soft">
        “{h.quote}”
      </blockquote>

      <div className="mt-3 flex items-center gap-1 text-xs">
        <button onClick={onGo} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-accent hover:bg-accent-soft">
          Go to passage <ArrowUpRight size={13} />
        </button>
        {h.page && <span className="px-1 text-ink-faint">Page {h.page}</span>}
        <div className="ml-auto flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
          {!editing && hasNote && (
            <CardButton label="Edit note" onClick={onEdit}>
              <Pencil size={14} />
            </CardButton>
          )}
          <CardButton label="Ask AI about this" onClick={onAskAI}>
            <Sparkles size={14} />
          </CardButton>
          <CardButton label={hasNote ? 'Delete note and highlight' : 'Delete highlight'} onClick={onDelete}>
            <Trash2 size={14} />
          </CardButton>
        </div>
      </div>
    </li>
  )
}

function CardButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      title={props.label}
      aria-label={props.label}
      className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-accent-soft hover:text-accent"
    >
      {props.children}
    </button>
  )
}

/** Inline note editing, autosaved as you type (same behavior as the Reading View). */
function NoteEditor({ highlight, onDone }: { highlight: Highlight; onDone: () => void }) {
  const [text, setText] = useState(highlight.note)
  const [saved, setSaved] = useState(true)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<string | null>(null)

  const save = (value: string) =>
    updateHighlights(highlight.itemId, (l) =>
      l.map((h) => (h.id === highlight.id ? { ...h, note: value, updatedAt: Date.now() } : h)),
    )

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (pending.current !== null) save(pending.current)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
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
        placeholder="Write a note…"
        className="field resize-y text-[15px] leading-relaxed"
      />
      <div className="mt-2 flex items-center justify-end gap-3">
        <span className="text-xs text-ink-faint">{saved ? 'Saved' : 'Saving…'}</span>
        <button onClick={onDone} className="btn-primary px-3 py-1 text-xs">
          <Check size={13} /> Done
        </button>
      </div>
    </div>
  )
}

// --- undo ---------------------------------------------------------------------------

function UndoToast({ undo, onUndo, onExpire }: { undo: Undo; onUndo: () => void; onExpire: () => void }) {
  const [left, setLeft] = useState(UNDO_SECONDS)
  // Kept in a ref so page re-renders don't restart the countdown.
  const expire = useRef(onExpire)
  useEffect(() => {
    expire.current = onExpire
  }, [onExpire])
  useEffect(() => {
    if (left <= 0) {
      expire.current()
      return
    }
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left])

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 overflow-hidden rounded-xl bg-ink py-3 pl-5 pr-3 text-sm text-paper shadow-xl"
    >
      <span>{undo.message}</span>
      <button onClick={onUndo} className="rounded-md px-3 py-1 font-semibold text-[#f3c9c3] hover:bg-paper/10">
        Undo ({left}s)
      </button>
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-[#f3c9c3] transition-[width] duration-1000 ease-linear"
        style={{ width: `${(left / UNDO_SECONDS) * 100}%` }}
      />
    </div>
  )
}
