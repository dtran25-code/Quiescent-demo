// Custom pieces for the Notes page editor (TipTap).

import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { HighlightCardView } from './HighlightCardView'

/**
 * A highlight embedded in the page. It stores only the highlight's id; the quote
 * and note are read live from the highlights store, so editing a note in the
 * Reading View updates the card, and vice versa. Removing the card from the page
 * never deletes the highlight.
 */
export const HighlightCard = Node.create({
  name: 'highlightCard',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      highlightId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-highlight-id'),
        renderHTML: (attrs) => ({ 'data-highlight-id': attrs.highlightId }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-highlight-card]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-highlight-card': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(HighlightCardView)
  },
})

/**
 * Headings the app creates for a chapter remember which chapter they belong to,
 * so new highlights can be filed under the right heading. Headings you type
 * yourself have no chapter.
 */
export const ChapterHeading = Extension.create({
  name: 'chapterHeading',
  addGlobalAttributes() {
    return [
      {
        types: ['heading'],
        attributes: {
          chapterId: {
            default: null,
            keepOnSplit: false,
            parseHTML: (el) => el.getAttribute('data-chapter-id'),
            renderHTML: (attrs) => (attrs.chapterId ? { 'data-chapter-id': attrs.chapterId } : {}),
          },
        },
      },
    ]
  },
})
