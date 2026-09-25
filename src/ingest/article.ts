// Turns article text into blocks (paragraphs, headings, quotes, list items)
// and chapters (one per H1/H2/H3 heading).
//
// Two inputs are supported:
//  - HTML from the link fetcher (Mozilla Readability output)
//  - Plain text the user pasted, with optional markdown-style headings ("# ", "## ", "### ")

import type { ArticleBlock, Chapter } from '../types'

type RawBlock = Omit<ArticleBlock, 'chapterId'>

export function articleFromText(text: string, fallbackTitle: string) {
  const raw: RawBlock[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) raw.push({ kind: 'p', text: para.join(' ') })
    para = []
  }
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const t = line.trim()
    const heading = /^(#{1,3})\s+(.*)$/.exec(t)
    if (!t) flush()
    else if (heading) {
      flush()
      raw.push({ kind: `h${heading[1].length}` as RawBlock['kind'], text: heading[2] })
    } else if (t.startsWith('> ')) {
      flush()
      raw.push({ kind: 'quote', text: t.slice(2) })
    } else if (/^[-*•]\s+/.test(t)) {
      flush()
      raw.push({ kind: 'li', text: t.replace(/^[-*•]\s+/, '') })
    } else para.push(t)
  }
  flush()
  return finish(raw, fallbackTitle)
}

export function articleFromHtml(html: string, fallbackTitle: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const raw: RawBlock[] = []
  const clean = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()

  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase()
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') raw.push({ kind: tag, text: clean(child.textContent) })
      else if (tag === 'h4' || tag === 'h5' || tag === 'h6') raw.push({ kind: 'p', text: clean(child.textContent) })
      else if (tag === 'p' || tag === 'pre') raw.push({ kind: 'p', text: clean(child.textContent) })
      else if (tag === 'blockquote') {
        const inner = child.querySelectorAll('p')
        if (inner.length) inner.forEach((p) => raw.push({ kind: 'quote', text: clean(p.textContent) }))
        else raw.push({ kind: 'quote', text: clean(child.textContent) })
      } else if (tag === 'li') raw.push({ kind: 'li', text: clean(child.textContent) })
      else if (['script', 'style', 'figure', 'img', 'svg', 'table', 'nav'].includes(tag)) continue
      else walk(child)
    }
  }
  walk(doc.body)
  return finish(
    raw.filter((b) => b.text.length > 0),
    fallbackTitle,
  )
}

/** Assign every block to the chapter of the nearest heading above it. */
function finish(raw: RawBlock[], fallbackTitle: string) {
  const firstH1 = raw.find((b) => b.kind === 'h1')
  const title = firstH1?.text || fallbackTitle

  const chapters: Chapter[] = []
  const blocks: ArticleBlock[] = []
  let current: Chapter | null = null

  for (const b of raw) {
    const isHeading = b.kind === 'h1' || b.kind === 'h2' || b.kind === 'h3'
    if (isHeading) {
      current = {
        id: `ch-${chapters.length + 1}`,
        // The article's own title heading introduces the opening section.
        title: b === firstH1 ? 'Introduction' : b.text,
        level: Number(b.kind[1]),
        // Page ranges don't apply to articles.
      }
      chapters.push(current)
    } else if (!current) {
      current = { id: 'ch-intro', title: 'Introduction', level: 1 }
      chapters.push(current)
    }
    blocks.push({ ...b, chapterId: current.id })
  }

  if (chapters.length === 0) chapters.push({ id: 'ch-intro', title: 'Full text', level: 1 })
  return { title, blocks, chapters }
}
