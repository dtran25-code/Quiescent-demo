import type { ChatMessage } from '../storage/db'
import type { Highlight, ItemType } from '../types'

export type AIAction = 'explain' | 'summarize' | 'polish' | 'expand' | 'chat'

/** Something the user pointed the assistant at: a selected passage or one of their notes. */
export interface Attachment {
  kind: 'selection' | 'note'
  /** The passage text (for a note: the highlighted quote). */
  text: string
  /** For notes: the note itself and its highlight. */
  note?: string
  highlightId?: string
  /** The chapter the passage belongs to (it becomes the assistant's context chapter). */
  chapterId?: string
}

/**
 * Everything the assistant is told on each request. Scope for the mockup:
 * this item only. To add cross-item context later (e.g. notes from other
 * items on the same topic), add a field here and fill it in ai/context.ts;
 * the UI doesn't need to change.
 */
export interface AIContext {
  item: { id: string; title: string; type: ItemType }
  chapter: { id: string; title: string; text: string }
  attachment: Attachment | null
  /** All of the user's highlights and notes for this item. */
  highlights: Highlight[]
  /** What the user typed on the Notes page in this chapter's section (paragraphs and list items). */
  pageNotes: string[]
  /** Earlier messages in this item's conversation (most recent last). */
  history: ChatMessage[]
}

export interface AIRequest {
  action: AIAction
  /** The user's typed message (free chat), if any. */
  message?: string
  context: AIContext
}
