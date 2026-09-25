import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import type { CustomTextRenderer } from 'react-pdf/dist/shared/types.js'
import 'react-pdf/dist/Page/TextLayer.css'
import '../ingest/pdfSetup'
import type { Highlight } from '../types'
import { markClass, segmentsFor } from './anchors'

const PAGE_GAP = 28
const TOP_PAD = 88
const MAX_WIDTH = 860

// Font data copied into public/pdfjs by scripts/copy-pdfjs-assets.mjs
const PDF_OPTIONS = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
}

interface Size {
  w: number
  h: number
}

/**
 * All pages stacked vertically, like a long scroll of book pages. Only pages near
 * the viewport are actually drawn; the rest are empty boxes of the right size.
 */
export function PdfView({
  file,
  highlights,
  activeId,
  scroller,
  onPosition,
  onReady,
}: {
  file: Blob
  highlights: Highlight[]
  activeId: string | null
  scroller: HTMLElement | null
  onPosition: (label: string, page: number) => void
  onReady: () => void
}) {
  const [sizes, setSizes] = useState<Size[] | null>(null)
  const [width, setWidth] = useState(760)
  const [view, setView] = useState({ top: 0, height: 900 })
  const [error, setError] = useState(false)

  // Page width follows the window width.
  useEffect(() => {
    if (!scroller) return
    const update = () => setWidth(Math.min(MAX_WIDTH, scroller.clientWidth - 64))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(scroller)
    return () => ro.disconnect()
  }, [scroller])

  // Layout: where each page starts.
  const layout = useMemo(() => {
    if (!sizes) return null
    let y = TOP_PAD
    return sizes.map((s) => {
      const height = Math.round((s.h / s.w) * width)
      const top = y
      y += height + PAGE_GAP
      return { top, height }
    })
  }, [sizes, width])

  // Track the scroll position to decide which pages to draw and which page we're on.
  useEffect(() => {
    if (!scroller) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setView({ top: scroller.scrollTop, height: scroller.clientHeight }))
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [scroller])

  const currentPage = useMemo(() => {
    if (!layout) return 1
    const probe = view.top + view.height * 0.35
    const idx = layout.findIndex((p) => probe < p.top + p.height + PAGE_GAP)
    return idx === -1 ? layout.length : idx + 1
  }, [layout, view])

  useEffect(() => {
    if (layout) onPosition(`${currentPage} / ${layout.length}`, currentPage)
  }, [currentPage, layout, onPosition])

  // Tell the reader once the page boxes exist, so it can restore the scroll position.
  const readySent = useRef(false)
  useEffect(() => {
    if (layout && !readySent.current) {
      readySent.current = true
      requestAnimationFrame(onReady)
    }
  }, [layout, onReady])

  const renderers = useTextRenderers(highlights, activeId)

  const onLoad = useCallback(async (pdf: { numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number } }> }) => {
    const pages = await Promise.all(Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1)))
    setSizes(pages.map((p) => {
      const v = p.getViewport({ scale: 1 })
      return { w: v.width, h: v.height }
    }))
  }, [])

  if (error) {
    return <p className="pt-40 text-center text-ink-soft">This PDF couldn't be opened.</p>
  }

  const total = layout ? layout[layout.length - 1].top + layout[layout.length - 1].height + 160 : 0
  const near = (p: { top: number; height: number }) =>
    p.top + p.height > view.top - view.height && p.top < view.top + view.height * 2

  return (
    <Document
      file={file}
      options={PDF_OPTIONS}
      onLoadSuccess={onLoad}
      onLoadError={() => setError(true)}
      loading={<p className="pt-40 text-center text-sm text-ink-faint">Opening PDF…</p>}
    >
      {layout && (
        <div className="relative" style={{ height: total }}>
          {layout.map((p, i) => (
            <div
              key={i}
              data-page={i + 1}
              className="absolute left-1/2 -translate-x-1/2 bg-white shadow-[0_1px_3px_rgba(43,39,36,0.08),0_8px_24px_rgba(43,39,36,0.06)]"
              style={{ top: p.top, width, height: p.height }}
            >
              {near(p) && (
                <Page
                  pageNumber={i + 1}
                  width={width}
                  renderAnnotationLayer={false}
                  customTextRenderer={renderers(i + 1)}
                  loading={null}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </Document>
  )
}

/**
 * Builds, per page, the function pdf.js uses to write each text item into the
 * selectable text layer. Each item is wrapped in <rh-u data-k> (a custom tag,
 * since the text layer repositions every <span>), and highlighted parts in <mark>.
 * Functions are reused while a page's highlights are unchanged, so pages don't
 * redraw needlessly.
 */
function useTextRenderers(highlights: Highlight[], activeId: string | null) {
  const cache = useRef(new Map<number, { key: string; fn: CustomTextRenderer }>())
  return useCallback(
    (page: number) => {
      const hs = highlights.filter((h) => h.page === page)
      const key = hs
        .map((h) => `${h.id}:${h.start.k}.${h.start.o}-${h.end.k}.${h.end.o}:${h.note.trim() ? 1 : 0}:${h.id === activeId ? 1 : 0}`)
        .join('|')
      const hit = cache.current.get(page)
      if (hit && hit.key === key) return hit.fn
      const fn: CustomTextRenderer = ({ str, itemIndex }) => {
        const inner = segmentsFor(itemIndex, str, hs)
          .map((seg) =>
            seg.hl ? `<mark data-hl="${seg.hl.id}" class="${markClass(seg.hl, activeId)}">${esc(seg.text)}</mark>` : esc(seg.text),
          )
          .join('')
        return `<rh-u data-k="${itemIndex}">${inner}</rh-u>`
      }
      cache.current.set(page, { key, fn })
      return fn
    },
    [highlights, activeId],
  )
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
