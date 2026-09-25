// Turning a text selection into a saved location, and saved highlights back
// into colored marks.
//
// Every piece of readable text is wrapped in an element with data-k="<index>":
// article blocks, or pdf.js text items on a page. A location is (k, character
// offset within k). PDF pages are additionally wrapped in data-page="<n>".

import type { Highlight, TextPos } from '../types'

export interface SelectionAnchor {
  start: TextPos
  end: TextPos
  page?: number
  quote: string
}

/** Resolve the current browser selection inside `root`, or null if it isn't a usable selection. */
export function anchorFromSelection(root: HTMLElement): SelectionAnchor | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null

  let start = posFromDom(range.startContainer, range.startOffset, 'start')
  let end = posFromDom(range.endContainer, range.endOffset, 'end')
  if (!start || !end) return null

  // Highlights stay within one PDF page.
  if (start.page !== end.page) return null

  // A selection that ends at the very start of the next unit (common with
  // triple-click) really ends at the end of the previous one.
  if (end.pos.o === 0 && end.pos.k > start.pos.k) {
    const prev = unitElement(root, end.page, end.pos.k - 1)
    if (prev) end = { ...end, pos: { k: end.pos.k - 1, o: prev.textContent?.length ?? 0 } }
  }
  if (compare(start.pos, end.pos) >= 0) return null

  const quote = sel.toString().replace(/\s+/g, ' ').trim()
  if (!quote) return null
  return { start: start.pos, end: end.pos, page: start.page, quote }
}

function unitElement(root: HTMLElement, page: number | undefined, k: number) {
  const scope = page ? root.querySelector(`[data-page="${page}"]`) : root
  return scope?.querySelector<HTMLElement>(`[data-k="${k}"]`) ?? null
}

/** Map a DOM (node, offset) to (page, k, offset). */
function posFromDom(node: Node, offset: number, edge: 'start' | 'end') {
  const el = node instanceof Element ? node : node.parentElement
  let unit = el?.closest<HTMLElement>('[data-k]') ?? null
  let charOffset = 0

  if (unit) {
    const r = document.createRange()
    r.setStart(unit, 0)
    r.setEnd(node, offset)
    charOffset = r.toString().length
  } else if (node instanceof Element) {
    // The boundary sits between elements (e.g. between PDF text items):
    // snap to the nearest unit in the selection's direction.
    const units = Array.from(node.querySelectorAll<HTMLElement>('[data-k]'))
    const boundary = node.childNodes[offset] ?? null
    if (edge === 'start') {
      unit = units.find((u) => !boundary || boundary === u || boundary.contains(u) || follows(boundary, u)) ?? null
      charOffset = 0
    } else {
      unit = [...units].reverse().find((u) => !boundary || precedes(boundary, u)) ?? null
      charOffset = unit?.textContent?.length ?? 0
    }
  }
  if (!unit) return null

  const pageAttr = unit.closest<HTMLElement>('[data-page]')?.dataset.page
  return {
    page: pageAttr ? Number(pageAttr) : undefined,
    pos: { k: Number(unit.dataset.k), o: charOffset },
  }
}

const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
const precedes = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING)

export function compare(a: TextPos, b: TextPos) {
  return a.k - b.k || a.o - b.o
}

/** Reading-order sort for highlights. */
export function byReadingOrder(a: Highlight, b: Highlight) {
  return (a.page ?? 0) - (b.page ?? 0) || compare(a.start, b.start)
}

// --- rendering ---------------------------------------------------------------

export interface Segment {
  text: string
  /** The highlight covering this piece (the most recently created if several overlap). */
  hl?: Highlight
}

/** Split the text of unit k into plain and highlighted pieces. */
export function segmentsFor(k: number, text: string, highlights: Highlight[]): Segment[] {
  const ranges = highlights
    .filter((h) => h.start.k <= k && k <= h.end.k)
    .map((h) => ({
      s: h.start.k === k ? h.start.o : 0,
      e: h.end.k === k ? h.end.o : text.length,
      h,
    }))
    .filter((r) => r.e > r.s)
  if (ranges.length === 0) return [{ text }]

  const cuts = new Set([0, text.length])
  ranges.forEach((r) => {
    cuts.add(Math.min(r.s, text.length))
    cuts.add(Math.min(r.e, text.length))
  })
  const points = [...cuts].sort((a, b) => a - b)
  const out: Segment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]]
    if (a === b) continue
    const covering = ranges.filter((r) => r.s <= a && r.e >= b).sort((x, y) => y.h.createdAt - x.h.createdAt)
    out.push({ text: text.slice(a, b), hl: covering[0]?.h })
  }
  return out
}

export function markClass(h: Highlight, activeId: string | null) {
  return `rh-mark${h.note.trim() ? ' has-note' : ''}${h.id === activeId ? ' active' : ''}`
}
