import { Highlighter, MessageSquarePlus, Sparkles } from 'lucide-react'

/** Small floating toolbar shown above a text selection. Positioned in window coordinates. */
export function SelectionToolbar({
  x,
  y,
  onHighlight,
  onHighlightNote,
  onAskAI,
}: {
  x: number
  y: number
  onHighlight: () => void
  onHighlightNote: () => void
  onAskAI: () => void
}) {
  return (
    <div
      role="toolbar"
      aria-label="Selection actions"
      // Keep the text selection alive when a button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-lg bg-ink p-1 text-[13px] text-paper shadow-lg"
      style={{ left: x, top: Math.max(8, y - 48) }}
    >
      <ToolButton onClick={onHighlight} icon={<Highlighter size={15} />} label="Highlight" />
      <ToolButton onClick={onHighlightNote} icon={<MessageSquarePlus size={15} />} label="Highlight + note" />
      <div className="mx-0.5 h-5 w-px bg-paper/20" />
      <ToolButton onClick={onAskAI} icon={<Sparkles size={15} />} label="Ask AI" />
    </div>
  )
}

function ToolButton(props: { onClick?: () => void; icon: React.ReactNode; label: string; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition-colors hover:bg-paper/15 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
    >
      {props.icon}
      {props.label}
    </button>
  )
}
