import { Highlighter, StickyNote, X } from 'lucide-react'
import type { Highlight, Item } from '../types'
import { byReadingOrder } from './anchors'

/** Round button on the reader's right edge, with a count of highlights. */
export function HighlightsButton({ count, right, onClick }: { count: number; right: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={count ? `Your highlights (${count})` : 'No highlights yet'}
      aria-label={`Your highlights: ${count}`}
      className={`absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-rule transition-all hover:scale-105 hover:text-accent ${
        count ? 'text-ink-soft' : 'text-ink-faint opacity-60'
      }`}
      style={{ right }}
    >
      <Highlighter size={19} strokeWidth={1.8} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold tabular-nums text-white">
          {count}
        </span>
      )}
    </button>
  )
}

/** Slim side panel listing this item's highlights and notes, grouped by chapter, in reading order. */
export function HighlightsPanel({
  item,
  highlights,
  activeId,
  onJump,
  onClose,
}: {
  item: Item
  highlights: Highlight[]
  activeId: string | null
  onJump: (h: Highlight) => void
  onClose: () => void
}) {
  const sorted = [...highlights].sort(byReadingOrder)
  const groups = item.chapters
    .map((c) => ({ chapter: c, items: sorted.filter((h) => h.chapterId === c.id) }))
    .filter((g) => g.items.length > 0)
  const noteCount = highlights.filter((h) => h.note.trim()).length

  return (
    <aside
      aria-label="Your highlights"
      className="absolute inset-y-0 right-0 z-30 flex w-[22rem] flex-col border-l border-rule bg-paper shadow-[-8px_0_24px_rgba(43,39,36,0.06)]"
    >
      <div className="flex items-center justify-between border-b border-rule px-5 py-4">
        <div>
          <h2 className="font-serif text-lg">Your highlights</h2>
          <p className="text-xs text-ink-faint">
            {highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'} · {noteCount}{' '}
            {noteCount === 1 ? 'note' : 'notes'}
          </p>
        </div>
        <button onClick={onClose} className="icon-btn" aria-label="Close highlights">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {groups.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm leading-relaxed text-ink-faint">
            No highlights yet.
            <br />
            Select any text to highlight it.
          </p>
        ) : (
          groups.map(({ chapter, items }) => (
            <section key={chapter.id} className="mb-4">
              <h3 className="px-2 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {chapter.title}
              </h3>
              <ul className="space-y-1">
                {items.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => onJump(h)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-paper-deep ${
                        h.id === activeId ? 'bg-accent-soft' : ''
                      }`}
                    >
                      <p className="line-clamp-2 border-l-2 border-accent/50 pl-2.5 font-serif text-[14px] leading-snug text-ink">
                        {h.quote}
                      </p>
                      {h.note.trim() && (
                        <p className="mt-1.5 flex gap-1.5 text-[13px] leading-snug text-ink-soft">
                          <StickyNote size={13} className="mt-0.5 shrink-0 text-accent" />
                          <span className="line-clamp-2">{h.note}</span>
                        </p>
                      )}
                      {h.page && <p className="mt-1 text-[11px] text-ink-faint">Page {h.page}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </aside>
  )
}

export interface Marker {
  highlight: Highlight
  /** 0–1: position within the whole document. */
  at: number
}

/** Small ticks along the right edge showing where each highlight sits in the document. */
export function MarginMarkers({ markers, right, onJump }: { markers: Marker[]; right: number; onJump: (h: Highlight) => void }) {
  if (markers.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-y-3 z-20 w-3" style={{ right }} aria-hidden="true">
      {markers.map(({ highlight: h, at }) => (
        <button
          key={h.id}
          tabIndex={-1}
          onClick={() => onJump(h)}
          title={h.note.trim() ? `${h.quote}\n\nNote: ${h.note}` : h.quote}
          className={`pointer-events-auto absolute right-0 -translate-y-1/2 rounded-full transition-all hover:h-1.5 hover:w-4 ${
            h.note.trim() ? 'h-[3px] w-3 bg-accent' : 'h-[3px] w-2.5 bg-accent/45'
          }`}
          style={{ top: `${at * 100}%` }}
        />
      ))}
    </div>
  )
}
