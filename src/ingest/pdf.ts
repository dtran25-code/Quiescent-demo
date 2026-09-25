// Reads a PDF file: title, page count, and chapters.
// Chapters come from the PDF's built-in outline (table of contents) when it has
// one; otherwise pages are grouped into fixed-size ranges.

import type { Chapter } from '../types'
import { pdfjs } from './pdfSetup'

const PAGES_PER_GROUP = 10

interface OutlineNode {
  title: string
  dest: string | unknown[] | null
  items: OutlineNode[]
}

export async function readPdf(file: Blob, fileName: string) {
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  const pdf = await task.promise
  try {
    const pageCount = pdf.numPages
    const meta = await pdf.getMetadata().catch(() => null)
    const metaTitle = (meta?.info as { Title?: string } | undefined)?.Title?.trim()
    const title = metaTitle || fileName.replace(/\.pdf$/i, '')

    let chapters = await chaptersFromOutline(pdf, pageCount)
    if (chapters.length === 0) chapters = chaptersFromPageRanges(pageCount)
    return { title, pageCount, chapters }
  } finally {
    task.destroy()
  }
}

async function chaptersFromOutline(pdf: pdfjs.PDFDocumentProxy, pageCount: number): Promise<Chapter[]> {
  let nodes = ((await pdf.getOutline().catch(() => null)) ?? []) as OutlineNode[]
  // A single top-level entry (often the book title) wrapping everything: use its children.
  while (nodes.length === 1 && nodes[0].items.length > 0) nodes = nodes[0].items

  const starts: { title: string; page: number }[] = []
  for (const node of nodes) {
    const page = await resolvePage(pdf, node.dest)
    if (page) starts.push({ title: node.title.trim(), page })
  }
  starts.sort((a, b) => a.page - b.page)
  if (starts.length === 0) return []

  const chapters: Chapter[] = []
  if (starts[0].page > 1) {
    chapters.push({ id: 'ch-front', title: 'Front matter', level: 1, startPage: 1, endPage: starts[0].page - 1 })
  }
  starts.forEach((s, i) => {
    const next = starts[i + 1]
    chapters.push({
      id: `ch-${i + 1}`,
      title: s.title,
      level: 1,
      startPage: s.page,
      endPage: next ? Math.max(s.page, next.page - 1) : pageCount,
    })
  })
  return chapters
}

async function resolvePage(pdf: pdfjs.PDFDocumentProxy, dest: OutlineNode['dest']): Promise<number | null> {
  try {
    const explicit = typeof dest === 'string' ? await pdf.getDestination(dest) : dest
    if (!explicit || explicit.length === 0) return null
    const target = explicit[0]
    const index =
      typeof target === 'number' ? target : await pdf.getPageIndex(target as Parameters<typeof pdf.getPageIndex>[0])
    return index + 1
  } catch {
    return null
  }
}

function chaptersFromPageRanges(pageCount: number): Chapter[] {
  const chapters: Chapter[] = []
  for (let start = 1, i = 1; start <= pageCount; start += PAGES_PER_GROUP, i++) {
    const end = Math.min(pageCount, start + PAGES_PER_GROUP - 1)
    chapters.push({
      id: `ch-${i}`,
      title: start === end ? `Page ${start}` : `Pages ${start}–${end}`,
      level: 1,
      startPage: start,
      endPage: end,
    })
  }
  return chapters
}
