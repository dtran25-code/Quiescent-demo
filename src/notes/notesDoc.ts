// Notes page document helpers: filing highlights into the page, and reading
// the user's typed text back out (for the AI assistant).

import type { Editor, JSONContent } from '@tiptap/core'
import type { Highlight, Item } from '../types'
import { byReadingOrder } from '../reader/anchors'

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

/**
 * Add highlight cards to the page, each filed at the end of its chapter's
 * section. A missing chapter heading is added at the end of the page. The
 * untitled opening of an article (no heading) goes before the first chapter
 * heading. Not added to undo history: it's the app filing, not the user editing.
 */
export function fileHighlights(editor: Editor, item: Item, toAdd: Highlight[]) {
  for (const h of [...toAdd].sort(byReadingOrder)) {
    const { state } = editor
    const top: { node: (typeof state.doc)['firstChild']; offset: number }[] = []
    state.doc.forEach((node, offset) => top.push({ node, offset }))
    const isChapterHeading = (i: number) => top[i].node?.type.name === 'heading' && !!top[i].node?.attrs.chapterId
    const chapter = item.chapters.find((c) => c.id === h.chapterId)
    const card: JSONContent = { type: 'highlightCard', attrs: { highlightId: h.id } }

    let pos: number
    let content: JSONContent[] = [card]
    const own = top.findLastIndex((t, i) => isChapterHeading(i) && t.node?.attrs.chapterId === h.chapterId)
    if (own !== -1) {
      const next = top.findIndex((_, i) => i > own && isChapterHeading(i))
      pos = next === -1 ? state.doc.content.size : top[next].offset
    } else if (!chapter?.title) {
      const firstHeading = top.findIndex((_, i) => isChapterHeading(i))
      pos = firstHeading === -1 ? state.doc.content.size : top[firstHeading].offset
    } else {
      pos = state.doc.content.size
      content = [{ type: 'heading', attrs: { level: 2, chapterId: chapter.id }, content: [{ type: 'text', text: chapter.title }] }, card]
    }

    // Keep blank lines the user left at the end of a section below the new card.
    let idx = top.findIndex((t) => t.offset === pos)
    if (idx === -1) idx = top.length
    while (idx > 0 && isBlankParagraph(top[idx - 1].node)) {
      idx--
      pos = top[idx].offset
    }

    const nodes = content.map((c) => state.schema.nodeFromJSON(c))
    const tr = state.tr.insert(pos, nodes)
    tr.setMeta('addToHistory', false)
    editor.view.dispatch(tr)
  }
}

function isBlankParagraph(node: { type: { name: string }; textContent: string; childCount: number } | null | undefined) {
  return !!node && node.type.name === 'paragraph' && node.childCount === 0
}

/** Ids of all highlight cards currently on the page. */
export function cardIds(doc: JSONContent): Set<string> {
  const ids = new Set<string>()
  const walk = (n: JSONContent) => {
    if (n.type === 'highlightCard' && n.attrs?.highlightId) ids.add(n.attrs.highlightId)
    n.content?.forEach(walk)
  }
  walk(doc)
  return ids
}

/**
 * What the user typed on the page, grouped by the chapter section it sits in.
 * Text before any chapter heading belongs to the item's first chapter.
 */
export function typedTextByChapter(doc: JSONContent, item: Item): Map<string, string[]> {
  const out = new Map<string, string[]>()
  let current = item.chapters[0]?.id ?? ''
  for (const node of doc.content ?? []) {
    if (node.type === 'heading' && node.attrs?.chapterId) {
      current = node.attrs.chapterId
      continue
    }
    if (node.type === 'highlightCard') continue
    const lines = node.type === 'bulletList' || node.type === 'orderedList' ? (node.content ?? []).map(textOf) : [textOf(node)]
    for (const line of lines.map((l) => l.trim()).filter(Boolean)) {
      out.set(current, [...(out.get(current) ?? []), line])
    }
  }
  return out
}

function textOf(n: JSONContent): string {
  if (n.type === 'text') return n.text ?? ''
  return (n.content ?? []).map(textOf).join(n.type === 'listItem' || n.type === 'blockquote' ? ' ' : '')
}
