import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowUp, EyeOff, FileText, Lightbulb, Minus, PenLine, RotateCcw, WandSparkles, X } from 'lucide-react'
import { appendChat, clearChat, newId, useChat } from '../storage/db'
import type { Highlight, Item } from '../types'
import { ask, AI_MODE } from './aiClient'
import { buildContext } from './context'
import { RichText } from './RichText'
import { saveAssistantSettings, useAssistantSettings } from './settings'
import type { AIAction, Attachment } from './types'
import { QTurtle, type QState } from '../icons/QTurtle'
import { track } from '../events/track'

const BUBBLE = 44
const PANEL_W = 384
const PANEL_H = 560

/**
 * Q, the AI assistant: a small floating turtle you can drag anywhere (it remembers
 * where), which opens into a chat panel.
 *
 * v2 changed only the look: the toggle and avatars are the Q turtle, which shows
 * Q's status (idle · thinking · answered · error). Behavior and panel logic are
 * v1's; events are logged alongside (q_opened, question_asked, answer_rendered…).
 */
export function Assistant({
  item,
  highlights,
  chapterId,
  attachment,
  onClearAttachment,
  openSignal,
}: {
  item: Item
  highlights: Highlight[]
  /** The chapter the user is currently in (or looking at). */
  chapterId: string | null
  /** A passage or note the user pointed the assistant at. */
  attachment: Attachment | null
  onClearAttachment: () => void
  /** Changes whenever the page wants the panel opened (e.g. "Ask AI" was clicked). */
  openSignal: number
}) {
  const settings = useAssistantSettings()
  const [open, setOpen] = useState(false)
  const [qState, setQState] = useState<QState>('idle')
  const answeredAt = useRef<number | null>(null)
  // Events for opening and closing the panel.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      track('q_opened', { item_id: item.id, has_selection: !!attachment })
      // Seen it: the toggle's answered/error badge clears once the panel is open.
      setQState((s) => (s === 'answered' || s === 'error' ? 'idle' : s))
    }
    // Closing after seeing the answer: no badge. (An answer that lands while closed still shows one.)
    if (!open && wasOpen.current) setQState((s) => (s === 'answered' || s === 'error' ? 'idle' : s))
    if (!open && wasOpen.current && answeredAt.current) {
      track('reading_resumed', { item_id: item.id, seconds_after_answer: (Date.now() - answeredAt.current) / 1000 })
      answeredAt.current = null
    }
    wasOpen.current = open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  // While dragging, the bubble follows the pointer; on release the spot is saved.
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const pos = dragPos ?? { x: settings.x, y: settings.y }
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })

  // Open when the page asks (e.g. "Ask AI" clicked).
  const [seenSignal, setSeenSignal] = useState(openSignal)
  if (openSignal !== seenSignal) {
    setSeenSignal(openSignal)
    setOpen(true)
  }
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Esc closes the panel before anything else on the page reacts to it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  if (!settings.enabled) return null

  // Bubble center in pixels, kept on screen.
  const cx = clamp(pos.x * viewport.w, BUBBLE / 2 + 8, viewport.w - BUBBLE / 2 - 8)
  const cy = clamp(pos.y * viewport.h, BUBBLE / 2 + 8, viewport.h - BUBBLE / 2 - 8)

  return open ? (
    <ChatPanel
      item={item}
      highlights={highlights}
      chapterId={chapterId}
      attachment={attachment}
      onClearAttachment={onClearAttachment}
      anchor={{ x: cx, y: cy }}
      viewport={viewport}
      onMinimize={() => setOpen(false)}
      qState={qState}
      onStatus={(s) => {
        setQState(s)
        if (s === 'answered') answeredAt.current = Date.now()
      }}
    />
  ) : (
    <Bubble
      cx={cx}
      cy={cy}
      hasAttachment={!!attachment}
      qState={qState}
      onMove={(x, y) => setDragPos({ x: x / viewport.w, y: y / viewport.h })}
      onDrop={(x, y) => {
        saveAssistantSettings({ x: x / viewport.w, y: y / viewport.h })
        setDragPos(null)
      }}
      onClick={() => setOpen(true)}
    />
  )
}

// --- the floating circle -----------------------------------------------------------

function Bubble(props: {
  cx: number
  cy: number
  hasAttachment: boolean
  qState: QState
  onMove: (x: number, y: number) => void
  onDrop: (x: number, y: number) => void
  onClick: () => void
}) {
  const drag = useRef<{ dx: number; dy: number; moved: boolean; startX: number; startY: number } | null>(null)

  const down = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { dx: e.clientX - props.cx, dy: e.clientY - props.cy, moved: false, startX: e.clientX, startY: e.clientY }
  }
  const move = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return
    d.moved = true
    props.onMove(e.clientX - d.dx, e.clientY - d.dy)
  }
  const up = (e: ReactPointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved) props.onDrop(e.clientX - d.dx, e.clientY - d.dy)
    else props.onClick()
  }

  return (
    <button
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => (drag.current = null)}
      // Keyboard activation (Enter/Space) arrives as a click with no pointer.
      onClick={(e) => e.detail === 0 && props.onClick()}
      aria-label={`Open Q${STATUS_TEXT[props.qState]}`}
      title="Q (drag to move)"
      className="fixed z-40 flex touch-none select-none items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-rule transition-[transform,box-shadow] hover:scale-105 hover:shadow-xl active:cursor-grabbing"
      style={{ left: props.cx - BUBBLE / 2, top: props.cy - BUBBLE / 2, width: BUBBLE, height: BUBBLE }}
    >
      <QTurtle size={44} state={props.qState} />
      {props.hasAttachment && (
        <span className="absolute -left-0.5 top-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-ink" aria-hidden="true" />
      )}
      <span className="sr-only" aria-live="polite">
        {STATUS_TEXT[props.qState]}
      </span>
    </button>
  )
}

// --- the chat panel ----------------------------------------------------------------

function ChatPanel({
  item,
  highlights,
  chapterId,
  attachment,
  onClearAttachment,
  anchor,
  viewport,
  onMinimize,
  qState,
  onStatus,
}: {
  item: Item
  highlights: Highlight[]
  chapterId: string | null
  attachment: Attachment | null
  onClearAttachment: () => void
  anchor: { x: number; y: number }
  viewport: { w: number; h: number }
  onMinimize: () => void
  qState: QState
  onStatus: (s: QState) => void
}) {
  const messages = useChat(item.id) ?? []
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  // A passage you pointed at wins over where you happen to be scrolled.
  const chapter = item.chapters.find((c) => c.id === (attachment?.chapterId ?? chapterId)) ?? item.chapters[0]
  const chapterName = chapter.title || item.title
  const chapterNotes = highlights.filter((h) => h.chapterId === chapter.id && h.note.trim()).length

  useLayoutEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [messages.length, thinking])
  useEffect(() => {
    input.current?.focus()
  }, [attachment])

  // Open next to the bubble, on whichever side has room.
  const w = Math.min(PANEL_W, viewport.w - 24)
  const h = Math.min(PANEL_H, viewport.h - 24)
  const left = clamp(anchor.x > viewport.w / 2 ? anchor.x + BUBBLE / 2 - w : anchor.x - BUBBLE / 2, 12, viewport.w - w - 12)
  const top = clamp(anchor.y > viewport.h / 2 ? anchor.y + BUBBLE / 2 - h : anchor.y - BUBBLE / 2, 12, viewport.h - h - 12)

  async function run(action: AIAction, typed?: string) {
    if (thinking) return
    const label = userLabel(action, chapterName, attachment, typed)
    await appendChat(item.id, { id: newId(), role: 'user', text: label, createdAt: Date.now() })
    setThinking(true)
    onStatus('thinking')
    const started = performance.now()
    track('question_asked', {
      item_id: item.id,
      request_type: REQUEST_TYPE[action],
      has_selection: !!attachment,
      session_turn: messages.filter((m) => m.role === 'user').length + 1,
      question_length: (typed ?? '').length,
    })
    try {
      const context = await buildContext({ item, chapterId: chapter.id, attachment, highlights })
      const reply = await ask({ action, message: typed, context })
      await appendChat(item.id, { id: newId(), role: 'assistant', text: reply, createdAt: Date.now() })
      const ms = performance.now() - started
      track('answer_rendered', { item_id: item.id, total_ms: ms, time_to_first_words_ms: ms })
      onStatus('answered')
    } catch (err) {
      track('answer_failed', { item_id: item.id, error_type: 'provider_error' })
      onStatus('error')
      await appendChat(item.id, {
        id: newId(),
        role: 'assistant',
        text: `Sorry, something went wrong: ${(err as Error).message}`,
        createdAt: Date.now(),
      })
    } finally {
      setThinking(false)
    }
  }

  function send() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    run('chat', text)
  }

  return (
    <div
      role="dialog"
      aria-label="Q"
      className="fixed z-40 flex flex-col overflow-hidden rounded-2xl bg-card font-sans shadow-2xl ring-1 ring-rule"
      style={{ left, top, width: w, height: h }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
        <QTurtle size={20} state={qState} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Q</p>
          <p className="truncate text-[11px] text-ink-faint">
            {AI_MODE === 'mock' ? 'Demo mode · canned responses' : 'Live'}
          </p>
        </div>
        <HeaderButton label="Clear conversation" onClick={() => clearChat(item.id)} disabled={messages.length === 0}>
          <RotateCcw size={15} />
        </HeaderButton>
        <HeaderButton
          label="Turn off Q"
          onClick={() => {
            track('q_toggled', { on: false })
            saveAssistantSettings({ enabled: false })
          }}
        >
          <EyeOff size={15} />
        </HeaderButton>
        <HeaderButton label="Minimize" onClick={onMinimize}>
          <Minus size={16} />
        </HeaderButton>
      </div>

      {/* What the assistant can see */}
      <div className="border-b border-rule bg-paper px-4 py-2 text-[11px] text-ink-soft">
        Context: <span className="font-medium text-ink">{chapterName}</span> · {highlights.length}{' '}
        {highlights.length === 1 ? 'highlight' : 'highlights'} ·{' '}
        {chapterNotes} {chapterNotes === 1 ? 'note' : 'notes'} in this section
      </div>

      {/* Conversation */}
      <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13.5px] leading-relaxed text-ink-soft">
        {messages.length === 0 && !thinking && (
          <div className="rounded-xl bg-paper px-4 py-3">
            <p className="font-medium text-ink">Hi! I'm reading along with you.</p>
            <p className="mt-1">
              I can see <em>{item.title}</em>, the section you're in, and your highlights and notes. Pick an action below or ask
              me anything.
            </p>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="ml-8 rounded-xl rounded-br-sm bg-accent-soft px-3.5 py-2 text-ink">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="mr-4 flex gap-2">
              <span className="mt-0.5">
                <QTurtle size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <RichText text={m.text} />
              </div>
            </div>
          ),
        )}
        {thinking && (
          <div className="flex items-center gap-1.5 py-1" aria-label="Q is thinking">
            <span className="mr-1">
              <QTurtle size={20} state="thinking" />
            </span>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent/60" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions + input */}
      <div className="border-t border-rule px-3 pb-3 pt-2.5">
        {attachment && (
          <div className="mb-2 flex items-start gap-2 rounded-lg bg-paper px-3 py-2 text-xs text-ink-soft">
            <span className="shrink-0 font-medium text-ink">{attachment.kind === 'note' ? 'Note:' : 'Selected:'}</span>
            <span className="line-clamp-2 flex-1 font-serif italic">
              {attachment.kind === 'note' && attachment.note?.trim() ? attachment.note : `“${attachment.text}”`}
            </span>
            <button onClick={onClearAttachment} className="shrink-0 text-ink-faint hover:text-ink" aria-label="Remove attachment">
              <X size={13} />
            </button>
          </div>
        )}
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Chip
            icon={<Lightbulb size={13} />}
            label="Explain this"
            onClick={() => run('explain')}
            disabled={thinking || !attachment}
            title={attachment ? 'Explain the selected passage' : 'Select a passage (or use Ask AI on a note) first'}
          />
          <Chip icon={<FileText size={13} />} label="Summarize this section" onClick={() => run('summarize')} disabled={thinking} />
          <Chip icon={<PenLine size={13} />} label="Polish my notes" onClick={() => run('polish')} disabled={thinking} />
          <Chip icon={<WandSparkles size={13} />} label="Expand this idea" onClick={() => run('expand')} disabled={thinking} />
        </div>
        <div className="flex items-end gap-2 rounded-xl border border-rule bg-paper/60 px-3 py-2 focus-within:border-accent">
          <textarea
            ref={input}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask about what you're reading…"
            className="max-h-24 flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || thinking}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function userLabel(action: AIAction, chapterTitle: string, attachment: Attachment | null, typed?: string) {
  const passage = attachment ? ` “${short(attachment.text)}”` : ''
  const target = attachment?.kind === 'note' && attachment.note?.trim() ? ` “${short(attachment.note)}”` : passage
  switch (action) {
    case 'explain':
      return `Explain this:${passage}`
    case 'summarize':
      return `Summarize what I just read (${chapterTitle})`
    case 'polish':
      return `Polish my notes for ${chapterTitle}`
    case 'expand':
      return `Expand this idea${target}`
    default:
      return typed ?? ''
  }
}

function short(s: string) {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > 80 ? t.slice(0, 79) + '…' : t
}

function Chip(props: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-rule disabled:hover:bg-transparent disabled:hover:text-ink-soft"
    >
      {props.icon}
      {props.label}
    </button>
  )
}

function HeaderButton(props: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.label}
      aria-label={props.label}
      className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink disabled:opacity-35"
    >
      {props.children}
    </button>
  )
}

/** Small on/off switch for the assistant, used in page headers. */
export function AssistantToggle({ className = '' }: { className?: string }) {
  const { enabled } = useAssistantSettings()
  return (
    <button
      onClick={() => {
        track('q_toggled', { on: !enabled })
        saveAssistantSettings({ enabled: !enabled })
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        enabled ? 'text-accent hover:bg-accent-soft' : 'text-ink-faint hover:bg-paper-deep hover:text-ink'
      } ${className}`}
      title={enabled ? 'Turn off Q' : 'Turn on Q'}
      aria-pressed={enabled}
    >
      <QTurtle size={20} />
      {enabled ? 'Q on' : 'Q off'}
    </button>
  )
}

const STATUS_TEXT: Record<QState, string> = {
  idle: '',
  thinking: ' — thinking',
  answered: ' — new answer',
  error: " — couldn't answer",
}

/** question_asked.request_type. The PRD has the model assign it; the prototype maps the action. */
const REQUEST_TYPE: Record<AIAction, 'explanation' | 'summary' | 'notes_summary' | 'outside_info' | 'other'> = {
  explain: 'explanation',
  summarize: 'summary',
  polish: 'notes_summary',
  expand: 'other',
  chat: 'other',
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
