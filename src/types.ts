// Core data model for ReadHub. Everything saved in the browser has one of these shapes.

export type ItemType = 'article' | 'pdf'

/** A chapter or section. PDFs: a page range. Articles: a heading. */
export interface Chapter {
  id: string
  title: string
  /** Nesting depth: 1 = top level. For articles this mirrors H1/H2/H3. */
  level: number
  /** PDF only: 1-based inclusive page range. */
  startPage?: number
  endPage?: number
}

/** One paragraph-like unit of article text. Highlights point into these. */
export interface ArticleBlock {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'quote' | 'li'
  text: string
  chapterId: string
}

export interface Item {
  id: string
  title: string
  type: ItemType
  /** Where it came from: a web URL for articles, the file name for PDFs. */
  sourceUrl?: string
  fileName?: string
  addedAt: number
  /** 0–100 */
  progress: number
  chapters: Chapter[]
  /** Articles only: the cleaned text, split into blocks. */
  blocks?: ArticleBlock[]
  /** PDFs only. The file itself is stored separately (see storage/db.ts). */
  pageCount?: number
  isSample?: boolean
}

/**
 * A point in the text. `k` is the block index (articles) or the pdf.js text-item
 * index on the page (PDFs); `o` is the character offset within it.
 */
export interface TextPos {
  k: number
  o: number
}

export interface Highlight {
  id: string
  itemId: string
  chapterId: string
  /** The exact quoted text. */
  quote: string
  /** PDFs only: 1-based page number. */
  page?: number
  start: TextPos
  end: TextPos
  note: string
  createdAt: number
  updatedAt: number
}
