// Assembles the context sent with every assistant request.

import { getChat, getFile } from '../storage/db'
import { pdfjs } from '../ingest/pdfSetup'
import type { Chapter, Highlight, Item } from '../types'
import type { AIContext, Attachment } from './types'

const MAX_PDF_PAGES = 30
const MAX_HISTORY = 20

export async function buildContext(input: {
  item: Item
  chapterId: string | null
  attachment: Attachment | null
  highlights: Highlight[]
}): Promise<AIContext> {
  const { item, attachment, highlights } = input
  const chapter = item.chapters.find((c) => c.id === input.chapterId) ?? item.chapters[0]
  const [text, history] = await Promise.all([chapterText(item, chapter), getChat(item.id)])
  return {
    item: { id: item.id, title: item.title, type: item.type },
    chapter: { id: chapter.id, title: chapter.title, text },
    attachment,
    highlights,
    history: history.slice(-MAX_HISTORY),
  }
}

const cache = new Map<string, string>()

/** The plain text of one chapter. PDFs are read page by page (and cached). */
export async function chapterText(item: Item, chapter: Chapter): Promise<string> {
  if (item.type === 'article') {
    return (item.blocks ?? [])
      .filter((b) => b.chapterId === chapter.id)
      .map((b) => b.text)
      .join('\n\n')
  }
  const key = `${item.id}:${chapter.id}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const file = await getFile(item.id)
  if (!file) return ''
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
  })
  try {
    const pdf = await task.promise
    const start = chapter.startPage ?? 1
    const end = Math.min(chapter.endPage ?? start, start + MAX_PDF_PAGES - 1, pdf.numPages)
    const pages: string[] = []
    for (let n = start; n <= end; n++) {
      const content = await (await pdf.getPage(n)).getTextContent()
      pages.push(
        content.items
          .map((i) => ('str' in i ? i.str + (i.hasEOL ? '\n' : '') : ''))
          .join('')
          .replace(/-\n(?=[a-z])/g, '') // re-join hyphenated line breaks
          .replace(/[ \t]*\n[ \t]*/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim(),
      )
    }
    const text = pages.join('\n\n')
    cache.set(key, text)
    return text
  } catch {
    return ''
  } finally {
    task.destroy()
  }
}
