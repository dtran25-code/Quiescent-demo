import { createContext, useContext } from 'react'
import type { Highlight, Item } from '../../types'

/** What highlight cards inside the editor need from the Notes page. */
export interface NotesContextValue {
  item: Item
  highlights: Map<string, Highlight>
  /** Open the Reading View at this highlight. */
  onGo: (h: Highlight) => void
  /** Point the AI assistant at this highlight. */
  onAskAI: (h: Highlight) => void
}

export const NotesContext = createContext<NotesContextValue | null>(null)

export function useNotesContext() {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('Highlight cards must be rendered inside the Notes page')
  return ctx
}
