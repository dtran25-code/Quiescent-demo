import { memo } from 'react'
import type { ArticleBlock, Highlight, Item } from '../types'
import { markClass, segmentsFor } from './anchors'

/** The article laid out like a book page. Each block carries data-k for highlight anchoring. */
export const ArticleView = memo(function ArticleView({
  item,
  highlights,
  activeId,
  pulseId,
}: {
  item: Item
  highlights: Highlight[]
  activeId: string | null
  pulseId: string | null
}) {
  const blocks = item.blocks ?? []
  const firstIsTitle = blocks[0]?.kind === 'h1'

  return (
    <article className="mx-auto max-w-[40rem] px-8 pb-40 pt-24 font-serif text-ink">
      {!firstIsTitle && <h1 className="mb-10 text-[2.6rem] leading-tight tracking-tight">{item.title}</h1>}
      {blocks.map((b, k) => (
        <Block key={k} k={k} block={b} isFirstOfChapter={k === 0 || blocks[k - 1].chapterId !== b.chapterId}>
          {segmentsFor(k, b.text, highlights).map((seg, i) =>
            seg.hl ? (
              <mark key={i} data-hl={seg.hl.id} className={markClass(seg.hl, activeId, pulseId)}>
                {seg.text}
              </mark>
            ) : (
              seg.text
            ),
          )}
        </Block>
      ))}
    </article>
  )
})

function Block({
  k,
  block,
  isFirstOfChapter,
  children,
}: {
  k: number
  block: ArticleBlock
  isFirstOfChapter: boolean
  children: React.ReactNode
}) {
  // data-chapter marks where each chapter begins, for the position indicator.
  const common = { 'data-k': k, 'data-chapter': isFirstOfChapter ? block.chapterId : undefined }
  switch (block.kind) {
    case 'h1':
      return (
        <h1 {...common} className="mb-10 text-[2.6rem] leading-tight tracking-tight">
          {children}
        </h1>
      )
    case 'h2':
      return (
        <h2 {...common} className="mb-5 mt-14 text-[1.75rem] leading-snug">
          {children}
        </h2>
      )
    case 'h3':
      return (
        <h3 {...common} className="mb-4 mt-10 text-[1.3rem] font-semibold leading-snug">
          {children}
        </h3>
      )
    case 'quote':
      return (
        <blockquote {...common} className="my-8 border-l-2 border-accent/60 pl-6 text-[1.25rem] italic leading-[1.7] text-ink-soft">
          {children}
        </blockquote>
      )
    case 'li':
      return (
        <p {...common} className="relative mb-3 pl-6 text-[1.19rem] leading-[1.8] before:absolute before:left-1 before:text-accent before:content-['•']">
          {children}
        </p>
      )
    default:
      return (
        <p {...common} className="mb-6 text-[1.19rem] leading-[1.8]">
          {children}
        </p>
      )
  }
}
