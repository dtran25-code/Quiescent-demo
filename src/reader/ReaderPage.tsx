import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { getFile, newId, updateHighlights, updateItem, useHighlights, useItem } from '../storage/db'
import type { Chapter, Highlight, Item } from '../types'
import { anchorFromSelection, type SelectionAnchor } from './anchors'
import { ArticleView } from './ArticleView'
import { PdfView } from './PdfView'
import { SelectionToolbar } from './SelectionToolbar'
import { NotePopover } from './NotePopover'
import { HighlightsButton, HighlightsPanel, MarginMarkers, type Marker } from './HighlightsPanel'

const NO_HIGHLIGHTS: Highlight[] = []

export function ReaderPage() {
  const { id } = useParams()
  const item = useItem(id)

  if (item === undefined) return <div className="fixed inset-0 bg-paper" />
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
  return <Reader key={item.id} item={item} />
}

interface ToolbarState {
  anchor: SelectionAnchor
  /** Window coordinates, for the toolbar. */
  x: number
  y: number
  /** Content coordinates, for a note window opened from it. */
  noteX: number
  noteY: number
}

function Reader({ item }: { item: Item }) {
  const navigate = useNavigate()
  const highlights = useHighlights(item.id) ?? NO_HIGHLIGHTS
  const [file, setFile] = useState<Blob | null>(null)
  // The scrolling element: kept as state (so effects re-run once it exists) and as a ref (for writes).
  const [scroller, setScrollerState] = useState<HTMLElement | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const setScroller = useCallback((el: HTMLElement | null) => {
    scrollerRef.current = el
    setScrollerState(el)
  }, [])
  const content = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ label: '', chapter: '' })
  const [atTop, setAtTop] = useState(true)
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null)
  const [note, setNote] = useState<{ id: string; x: number; y: number } | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [pulseId, setPulseId] = useState<string | null>(null)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [scrollbar, setScrollbar] = useState(0)
  const fullscreen = useFullscreen()
  const restored = useRef(false)

  useEffect(() => {
    if (item.type === 'pdf') getFile(item.id).then((f) => setFile(f ?? null))
  }, [item.id, item.type])

  // --- position, progress, and resuming where you left off -------------------

  const restore = useCallback(() => {
    const el = scrollerRef.current
    if (!el || restored.current) return
    el.scrollTop = (item.lastScroll ?? 0) * (el.scrollHeight - el.clientHeight)
    restored.current = true
  }, [item.lastScroll])

  // Articles are laid out immediately; PDFs call restore() once their pages are sized.
  useLayoutEffect(() => {
    if (item.type === 'article' && scroller) restore()
  }, [item.type, scroller, restore])

  // Chapters, read through a ref so saving progress (which refreshes `item`)
  // doesn't re-run the scroll listener below.
  const chaptersRef = useRef(item.chapters)
  useEffect(() => {
    chaptersRef.current = item.chapters
  }, [item.chapters])

  useEffect(() => {
    if (!scroller) return
    let timer: number | undefined
    const updatePosition = () => {
      setAtTop(scroller.scrollTop < 40)
      if (item.type === 'article') setPosition(articlePosition(scroller, chaptersRef.current))
    }
    const onScroll = () => {
      updatePosition()
      setToolbar(null)
      if (!restored.current) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const max = scroller.scrollHeight - scroller.clientHeight
        const ratio = max > 0 ? Math.min(1, scroller.scrollTop / max) : 1
        updateItem(item.id, { progress: Math.round(ratio * 100), lastScroll: ratio })
      }, 400)
    }
    updatePosition()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [scroller, item.id, item.type])

  const onPdfPosition = useCallback(
    (label: string, page: number) => setPosition({ label, chapter: chapterForPage(item.chapters, page)?.title ?? '' }),
    [item.chapters],
  )

  // --- selecting, highlighting, notes ----------------------------------------

  function onMouseUp() {
    // Let the browser finish updating the selection first.
    setTimeout(() => {
      if (!content.current) return
      const anchor = anchorFromSelection(content.current)
      if (!anchor) return setToolbar(null)
      const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect()
      const box = content.current.getBoundingClientRect()
      setToolbar({
        anchor,
        x: rect.left + rect.width / 2,
        y: rect.top,
        ...notePlacement(rect, box),
      })
    }, 0)
  }

  function onClick(e: React.MouseEvent) {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) return
    const mark = (e.target as HTMLElement).closest<HTMLElement>('mark[data-hl]')
    if (!mark || !content.current) return
    setNote({ id: mark.dataset.hl!, ...placeFrom(mark.getBoundingClientRect(), content.current.getBoundingClientRect()) })
  }

  function createHighlight(withNote: boolean) {
    if (!toolbar) return
    const { anchor } = toolbar
    const chapterId =
      item.type === 'pdf'
        ? (chapterForPage(item.chapters, anchor.page ?? 1)?.id ?? item.chapters[0].id)
        : (item.blocks?.[anchor.start.k]?.chapterId ?? item.chapters[0].id)
    const now = Date.now()
    const hl: Highlight = {
      id: newId(),
      itemId: item.id,
      chapterId,
      quote: anchor.quote,
      page: anchor.page,
      start: anchor.start,
      end: anchor.end,
      note: '',
      createdAt: now,
      updatedAt: now,
    }
    updateHighlights(item.id, (list) => [...list, hl])
    window.getSelection()?.removeAllRanges()
    setToolbar(null)
    if (withNote) setNote({ id: hl.id, x: toolbar.noteX, y: toolbar.noteY })
  }

  // --- jumping to a highlight (from the side panel or a margin marker) --------

  async function jumpTo(h: Highlight) {
    const el = scrollerRef.current
    const box = content.current
    if (!el || !box) return
    const find = () => box.querySelector<HTMLElement>(`mark[data-hl="${h.id}"]`)
    // PDF pages far away aren't drawn yet: go to the page first, then wait for it.
    if (!find() && h.page) {
      const page = box.querySelector(`[data-page="${h.page}"]`)
      if (page) el.scrollTop += page.getBoundingClientRect().top - el.getBoundingClientRect().top - 60
    }
    const mark = await waitFor(find, 4000)
    if (!mark) return
    el.scrollTop += mark.getBoundingClientRect().top - el.getBoundingClientRect().top - el.clientHeight * 0.3
    setPulseId(h.id)
    window.setTimeout(() => setPulseId((p) => (p === h.id ? null : p)), 1800)
    if (h.note.trim()) {
      setNote({ id: h.id, ...placeFrom(mark.getBoundingClientRect(), box.getBoundingClientRect()) })
    } else setNote(null)
  }

  // --- margin markers: where each highlight sits in the whole document --------

  const highlightsRef = useRef(highlights)
  useEffect(() => {
    highlightsRef.current = highlights
  }, [highlights])

  const measure = useCallback(() => {
    const el = scrollerRef.current
    const box = content.current
    if (!el || !box) return
    setScrollbar(el.offsetWidth - el.clientWidth)
    const total = box.scrollHeight
    if (!total) return
    const top = box.getBoundingClientRect().top
    const next: Marker[] = []
    for (const h of highlightsRef.current) {
      const mark = box.querySelector(`mark[data-hl="${h.id}"]`)
      let y: number | null = null
      if (mark) y = mark.getBoundingClientRect().top - top
      else if (h.page) {
        // Page not drawn right now: place the marker on its page.
        const page = box.querySelector(`[data-page="${h.page}"]`)?.getBoundingClientRect()
        if (page) y = page.top - top + page.height * 0.4
      }
      if (y !== null) next.push({ highlight: h, at: Math.min(1, Math.max(0, y / total)) })
    }
    setMarkers(next)
  }, [])

  // Re-measure when highlights change, the layout changes size, or (lightly) after scrolling.
  useEffect(() => {
    const id = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(id)
  }, [highlights, measure])

  useEffect(() => {
    const box = content.current
    if (!scroller || !box) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(box)
    ro.observe(scroller)
    let timer: number | undefined
    const onScroll = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(measure, 250)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      scroller.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [scroller, measure])

  // --- keyboard: Esc closes the innermost thing, then leaves the reader -------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (note) setNote(null)
      else if (toolbar) {
        window.getSelection()?.removeAllRanges()
        setToolbar(null)
      } else if (panelOpen) setPanelOpen(false)
      else if (!document.fullscreenElement) navigate('/library')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [note, toolbar, panelOpen, navigate])

  const openNote = note ? highlights.find((h) => h.id === note.id) : undefined
  const closeNote = useCallback(() => setNote(null), [])

  return (
    <div className="fixed inset-0 bg-paper">
      {/* Slim top bar: hidden while reading, returns when you hover near the top. */}
      <header
        className={`absolute inset-x-0 top-0 z-20 flex items-center gap-4 bg-gradient-to-b from-paper via-paper/95 to-paper/0 px-5 pb-6 pt-3 transition-opacity duration-300 hover:opacity-100 ${
          atTop ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Link to="/library" className="icon-btn" title="Exit reading (Esc)" aria-label="Exit reading">
          <X size={19} />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-serif text-[15px] text-ink">{item.title}</p>
          {position.chapter && <p className="truncate text-xs text-ink-faint">{position.chapter}</p>}
        </div>
        <button
          onClick={fullscreen.toggle}
          className="icon-btn"
          title={fullscreen.on ? 'Exit full screen' : 'Full screen'}
          aria-label={fullscreen.on ? 'Exit full screen' : 'Full screen'}
        >
          {fullscreen.on ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </header>

      {/* When the highlights panel is open, the page narrows so nothing is hidden behind it. */}
      <main
        ref={setScroller}
        className="absolute inset-y-0 left-0 overflow-y-auto"
        style={{ right: panelOpen ? PANEL_WIDTH : 0 }}
        onMouseUp={onMouseUp}
        onClick={onClick}
      >
        <div ref={content} className="relative">
          {item.type === 'article' ? (
            <ArticleView item={item} highlights={highlights} activeId={note?.id ?? null} pulseId={pulseId} />
          ) : file ? (
            <PdfView
              file={file}
              highlights={highlights}
              activeId={note?.id ?? null}
              pulseId={pulseId}
              scroller={scroller}
              onPosition={onPdfPosition}
              onReady={restore}
            />
          ) : null}

          {openNote && note && <NotePopover key={openNote.id} highlight={openNote} x={note.x} y={note.y} onClose={closeNote} />}
        </div>
      </main>

      {/* Position stays visible while reading. */}
      {position.label && (
        <div
          className="pointer-events-none absolute bottom-4 z-20 -translate-x-1/2 rounded-full bg-paper/90 px-3 py-1 text-xs tabular-nums text-ink-faint"
          style={{ left: panelOpen ? `calc((100% - ${PANEL_WIDTH}px) / 2)` : '50%' }}
          title={item.type === 'pdf' ? 'Page' : 'Section'}
        >
          {item.type === 'pdf' ? 'Page ' : 'Section '}
          {position.label}
        </div>
      )}

      {/* Where your highlights are: margin ticks, a button, and a side panel. */}
      <MarginMarkers markers={markers} right={scrollbar + 3} onJump={jumpTo} />
      {panelOpen ? (
        <HighlightsPanel
          item={item}
          highlights={highlights}
          activeId={note?.id ?? pulseId}
          onJump={jumpTo}
          onClose={() => setPanelOpen(false)}
        />
      ) : (
        <HighlightsButton count={highlights.length} right={scrollbar + 22} onClick={() => setPanelOpen(true)} />
      )}

      {toolbar && (
        <SelectionToolbar
          x={toolbar.x}
          y={toolbar.y}
          onHighlight={() => createHighlight(false)}
          onHighlightNote={() => createHighlight(true)}
        />
      )}
    </div>
  )
}

// --- helpers -------------------------------------------------------------------

/** Poll until `get` returns something (e.g. a PDF page finishes drawing), or give up. */
function waitFor<T>(get: () => T | null, timeout: number): Promise<T | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      const v = get()
      if (v || Date.now() - started > timeout) resolve(v)
      else window.setTimeout(tick, 60)
    }
    tick()
  })
}

const NOTE_WIDTH = 352
const PANEL_WIDTH = 352 // matches w-[22rem] in HighlightsPanel

/** Place a note window just under a rectangle, in content coordinates, kept on screen. */
function placeFrom(rect: DOMRect, box: DOMRect) {
  const x = Math.min(Math.max(16, rect.left - box.left), box.width - NOTE_WIDTH - 16)
  return { x, y: rect.bottom - box.top + 10 }
}
function notePlacement(rect: DOMRect, box: DOMRect) {
  const p = placeFrom(rect, box)
  return { noteX: p.x, noteY: p.y }
}

function chapterForPage(chapters: Chapter[], page: number) {
  return chapters.find((c) => c.startPage !== undefined && page >= c.startPage && page <= (c.endPage ?? c.startPage))
}

/** Which article section is at the top of the screen. */
function articlePosition(scroller: HTMLElement, chapters: Chapter[]) {
  const probe = scroller.getBoundingClientRect().top + scroller.clientHeight * 0.3
  let current = 0
  scroller.querySelectorAll<HTMLElement>('[data-chapter]').forEach((el) => {
    if (el.getBoundingClientRect().top <= probe) {
      const idx = chapters.findIndex((c) => c.id === el.dataset.chapter)
      if (idx >= 0) current = idx
    }
  })
  return { label: `${current + 1} / ${chapters.length}`, chapter: chapters[current]?.title ?? '' }
}

function useFullscreen() {
  const [on, setOn] = useState(() => !!document.fullscreenElement)
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      // Leaving the reader also leaves browser full screen.
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }
  return { on, toggle }
}
