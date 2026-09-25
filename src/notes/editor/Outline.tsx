import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface Entry {
  pos: number
  level: number
  text: string
}

/** Clickable list of the page's headings; highlights the one you're reading. */
export function Outline({ editor }: { editor: Editor }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [active, setActive] = useState<number | null>(null)

  // Rebuild the list whenever the page changes.
  useEffect(() => {
    const collect = () => {
      const next: Entry[] = []
      editor.state.doc.forEach((node, offset) => {
        if (node.type.name === 'heading' && node.textContent.trim()) {
          next.push({ pos: offset, level: node.attrs.level, text: node.textContent })
        }
      })
      setEntries(next)
    }
    collect()
    editor.on('update', collect)
    return () => {
      editor.off('update', collect)
    }
  }, [editor])

  // Track which heading is at the top of the screen.
  useEffect(() => {
    const onScroll = () => {
      let current: number | null = null
      for (const e of entries) {
        const dom = editor.view.nodeDOM(e.pos) as HTMLElement | null
        if (dom && dom.getBoundingClientRect().top < 160) current = e.pos
      }
      setActive(current ?? entries[0]?.pos ?? null)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [editor, entries])

  function jump(e: Entry) {
    const dom = editor.view.nodeDOM(e.pos) as HTMLElement | null
    if (!dom) return
    window.scrollTo({ top: dom.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' })
    editor.commands.setTextSelection(e.pos + 1)
  }

  return (
    <nav aria-label="Outline" className="font-sans">
      <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Outline</p>
      {entries.length === 0 ? (
        <p className="px-2 text-xs leading-relaxed text-ink-faint">Headings you add will appear here.</p>
      ) : (
        <ul className="space-y-0.5 border-l border-rule">
          {entries.map((e) => (
            <li key={e.pos}>
              <button
                type="button"
                onClick={() => jump(e)}
                className={`-ml-px block w-full border-l-2 py-1 pr-2 text-left text-[13px] leading-snug transition-colors ${
                  e.level === 3 ? 'pl-6' : 'pl-3'
                } ${active === e.pos ? 'border-accent font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
              >
                <span className="line-clamp-2">{e.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
