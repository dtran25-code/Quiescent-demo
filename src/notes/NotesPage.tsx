import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { ArrowLeft, BookOpen, Trash2 } from 'lucide-react'
import { getNotesDoc, saveNotesDoc, useHighlights, useItem, type NotesDoc } from '../storage/db'
import type { Highlight, Item } from '../types'
import { ConfirmDialog } from '../components/Modal'
import { Assistant, AssistantToggle } from '../ai/Assistant'
import type { Attachment } from '../ai/types'
import { ChapterHeading, HighlightCard } from './editor/extensions'
import { NotesContext } from './editor/NotesContext'
import { Toolbar } from './editor/Toolbar'
import { Outline } from './editor/Outline'
import { EMPTY_DOC, fileHighlights } from './notesDoc'

const UNDO_SECONDS = 10
const SAVE_DELAY = 500

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
  return <NotesLoader key={item.id} item={item} />
}

/** Waits for the saved page and the highlights before creating the editor. */
function NotesLoader({ item }: { item: Item }) {
  const highlights = useHighlights(item.id)
  const [stored, setStored] = useState<NotesDoc | null>()
  useEffect(() => {
    getNotesDoc(item.id).then((d) => setStored(d ?? null))
  }, [item.id])
  if (stored === undefined || highlights === undefined) return null
  return <Notes item={item} highlights={highlights} stored={stored} />
}

function Notes({ item, highlights, stored }: { item: Item; highlights: Highlight[]; stored: NotesDoc | null }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'saved' | 'saving'>('saved')
  const [confirmClear, setConfirmClear] = useState(false)
  const [undo, setUndo] = useState<JSONContent | null>(null)
  // Assistant context: the section your cursor is in, and anything you pointed it at.
  const [focusChapter, setFocusChapter] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [openSignal, setOpenSignal] = useState(0)

  // Highlights ever placed on this page; cleared ones aren't re-added on their own.
  const known = useRef(new Set(stored?.known ?? []))
  const saveTimer = useRef<number | undefined>(undefined)
  // The latest page content, kept here so a final save still works after the editor closes.
  const latest = useRef<JSONContent | null>(null)

  const saveNow = useCallback(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = undefined
    if (!latest.current) return
    saveNotesDoc(item.id, { doc: latest.current, known: [...known.current], updatedAt: Date.now() }).then(() =>
      setStatus('saved'),
    )
  }, [item.id])

  const editor = useEditor({
    // Create the editor after the first render; highlight cards are React components
    // and can't be drawn while React is still rendering the page.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, link: false }),
      ChapterHeading,
      HighlightCard,
      Placeholder.configure({ placeholder: 'Start typing your notes…' }),
    ],
    content: (stored?.doc as JSONContent | undefined) ?? EMPTY_DOC,
    editorProps: { attributes: { class: 'notes-doc', 'aria-label': 'Notes page' } },
    onUpdate: ({ editor: e }) => {
      latest.current = e.getJSON()
      setStatus('saving')
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(saveNow, SAVE_DELAY)
    },
    onSelectionUpdate: ({ editor: e }) => setFocusChapter(chapterAtCursor(e, item)),
  })
  // Save anything pending when leaving the page.
  useEffect(
    () => () => {
      if (saveTimer.current !== undefined) saveNow()
    },
    [saveNow],
  )

  // File any highlights the page hasn't seen yet (all of them, the first time).
  useEffect(() => {
    if (!editor) return
    const fresh = highlights.filter((h) => !known.current.has(h.id))
    if (fresh.length === 0) return
    fresh.forEach((h) => known.current.add(h.id))
    // Next tick: the cards are React components, and React is mid-render right now.
    // (Not cancelled on re-render: these ids are already marked as filed.)
    window.setTimeout(() => !editor.isDestroyed && fileHighlights(editor, item, fresh))
  }, [editor, highlights, item])

  const isEmpty = useEditorState({ editor, selector: ({ editor: e }) => e?.isEmpty ?? true })

  const context = useMemo(
    () => ({
      item,
      highlights: new Map(highlights.map((h) => [h.id, h])),
      onGo: (h: Highlight) => navigate(`/read/${item.id}?hl=${h.id}`),
      onAskAI: (h: Highlight) => {
        setFocusChapter(h.chapterId)
        setAttachment({ kind: 'note', text: h.quote, note: h.note, highlightId: h.id, chapterId: h.chapterId })
        setOpenSignal((n) => n + 1)
      },
    }),
    [item, highlights, navigate],
  )

  function clearAll() {
    if (!editor) return
    setUndo(editor.getJSON())
    editor.commands.setContent(EMPTY_DOC, { emitUpdate: true })
    setConfirmClear(false)
  }

  function restore() {
    if (editor && undo) editor.commands.setContent(undo, { emitUpdate: true })
    setUndo(null)
  }

  const noteCount = highlights.filter((h) => h.note.trim()).length

  return (
    <NotesContext.Provider value={context}>
      {/* Extra room below the page so the outline can bring any heading to the top. */}
      <div className="mx-auto max-w-6xl px-8 pb-[60vh] pt-10">
        <header className="mb-8">
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
              {highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'} · {noteCount}{' '}
              {noteCount === 1 ? 'note' : 'notes'} in the Reading View
            </p>
            <button
              onClick={() => setConfirmClear(true)}
              disabled={isEmpty !== false}
              className="btn-ghost text-xs disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 size={14} /> Clear all notes
            </button>
          </div>
        </header>

        {editor && (
          <div className="flex gap-10">
            <aside className="sticky top-6 hidden h-fit max-h-[calc(100vh-3rem)] w-52 shrink-0 overflow-y-auto md:block">
              <Outline editor={editor} />
            </aside>
            <main className="min-w-0 max-w-[52rem] flex-1">
              <Toolbar editor={editor} item={item} highlights={highlights} status={status} />
              <div
                className="min-h-[70vh] cursor-text rounded-sm bg-white px-14 py-12 shadow-[0_1px_3px_rgba(43,39,36,0.08),0_10px_30px_rgba(43,39,36,0.06)] ring-1 ring-rule"
                onClick={(e) => e.target === e.currentTarget && editor.commands.focus('end')}
              >
                <EditorContent editor={editor} />
              </div>
            </main>
          </div>
        )}

        {confirmClear && (
          <ConfirmDialog
            title="Clear all notes?"
            message={
              <>
                This empties the page: everything you typed and all highlight cards. Your highlights and their notes stay in the
                Reading View. You'll have {UNDO_SECONDS} seconds to undo.
              </>
            }
            confirmLabel="Clear the page"
            onCancel={() => setConfirmClear(false)}
            onConfirm={clearAll}
          />
        )}

        {undo && <UndoToast message="Page cleared. Your highlights are still in the Reading View." onUndo={restore} onExpire={() => setUndo(null)} />}

        <Assistant
          item={item}
          highlights={highlights}
          chapterId={focusChapter}
          attachment={attachment}
          onClearAttachment={() => setAttachment(null)}
          openSignal={openSignal}
        />
      </div>
    </NotesContext.Provider>
  )
}

/** The chapter whose section the cursor is in (by the app-made chapter headings above it). */
function chapterAtCursor(editor: Editor, item: Item) {
  const cursor = editor.state.selection.from
  let chapter = item.chapters[0]?.id ?? null
  editor.state.doc.forEach((node, offset) => {
    if (offset < cursor && node.type.name === 'heading' && node.attrs.chapterId) chapter = node.attrs.chapterId
  })
  return chapter
}

// --- undo ---------------------------------------------------------------------------

function UndoToast({ message, onUndo, onExpire }: { message: string; onUndo: () => void; onExpire: () => void }) {
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
      <span>{message}</span>
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
