import { useEffect, useRef, useState } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import {
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react'
import type { Highlight, Item } from '../../types'
import { byReadingOrder } from '../../reader/anchors'
import { cardIds } from '../notesDoc'

/** Word-style formatting bar for the Notes page. */
export function Toolbar({
  editor,
  item,
  highlights,
  status,
}: {
  editor: Editor
  item: Item
  highlights: Highlight[]
  status: 'saved' | 'saving'
}) {
  // Re-render only when the formatting state under the cursor changes.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      paragraph: e.isActive('paragraph'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
  const chain = () => editor.chain().focus()

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-0 z-20 -mx-1 mb-4 flex flex-wrap items-center gap-0.5 rounded-xl bg-white/95 px-2 py-1.5 font-sans shadow-sm ring-1 ring-rule backdrop-blur"
    >
      <Btn label="Text" active={s.paragraph} onClick={() => chain().setParagraph().run()}>
        <Pilcrow size={16} />
      </Btn>
      <Btn label="Heading" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={17} />
      </Btn>
      <Btn label="Subheading" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={17} />
      </Btn>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <Bold size={16} />
      </Btn>
      <Btn label="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic size={16} />
      </Btn>
      <Btn label="Underline (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline size={16} />
      </Btn>
      <Sep />
      <Btn label="Bullet list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List size={17} />
      </Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered size={17} />
      </Btn>
      <Btn label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote size={16} />
      </Btn>
      <Sep />
      <Btn label="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 size={16} />
      </Btn>
      <Btn label="Redo (Ctrl+Y)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 size={16} />
      </Btn>
      <Sep />
      <InsertHighlight editor={editor} item={item} highlights={highlights} />
      <span className="ml-auto pr-2 text-xs text-ink-faint" aria-live="polite">
        {status === 'saving' ? 'Saving…' : 'Saved'}
      </span>
    </div>
  )
}

/** Put any highlight (back) onto the page at the cursor. */
function InsertHighlight({ editor, item, highlights }: { editor: Editor; item: Item; highlights: Highlight[] }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const onPage = open ? cardIds(editor.getJSON()) : new Set<string>()
  const sorted = [...highlights].sort(byReadingOrder)

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
          open ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-paper-deep hover:text-ink'
        }`}
        aria-expanded={open}
      >
        <Highlighter size={15} /> Insert highlight
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 max-h-80 w-96 overflow-y-auto rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-rule">
          {sorted.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-ink-faint">No highlights yet. Highlight passages in the Reading View.</p>
          ) : (
            sorted.map((h) => (
              <button
                key={h.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().insertContent({ type: 'highlightCard', attrs: { highlightId: h.id } }).run()
                  setOpen(false)
                }}
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-paper"
              >
                <span className="line-clamp-2 font-serif text-[13px] leading-snug text-ink">“{h.quote}”</span>
                <span className="mt-0.5 block text-[11px] text-ink-faint">
                  {[h.page ? `Page ${h.page}` : item.chapters.find((c) => c.id === h.chapterId)?.title, onPage.has(h.id) ? 'already on the page' : '']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Btn(props: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      // Keep the cursor in the page when clicking a toolbar button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30 ${
        props.active ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-paper-deep hover:text-ink'
      }`}
    >
      {props.children}
    </button>
  )
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-rule" />
}
