// Floating "Dev" button (bottom-right) on every page. Two tabs:
//   Controls  — user state switcher, Show dev notes, simulated failures, Reset demo data, links
//   Event log — every tracked event as it fires (timestamp, snake_case name, properties)

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bug, ExternalLink, Loader2, RotateCcw, Trash2, X } from 'lucide-react'
import { devStore, protoStore, useDev, useProto, USER_STATE_LABEL, type DevState, type UserState } from '../proto/store'
import { resetDemo } from '../samples/seed'
import { clearEventLog, useEventLog, type LoggedEvent } from '../events/track'

export function DevMenu() {
  const open = useDev((s) => s.panelOpen)
  const tab = useDev((s) => s.panelTab)
  const count = useEventLog().length
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement?.closest('#dev-panel')) {
        e.stopPropagation()
        devStore.set({ panelOpen: false })
        button.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <>
      <button
        ref={button}
        onClick={() => devStore.set({ panelOpen: !open })}
        aria-expanded={open}
        aria-controls="dev-panel"
        className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 font-mono text-xs font-semibold text-paper shadow-lg hover:bg-ink-soft"
      >
        <Bug size={14} /> Dev
      </button>
      {open && (
        <div
          id="dev-panel"
          role="dialog"
          aria-label="Developer tools"
          className="fixed bottom-14 right-4 z-[60] flex h-[min(42rem,calc(100vh-5rem))] w-devpanel max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-card font-sans text-ink shadow-2xl ring-1 ring-rule"
        >
          <div className="flex items-center gap-1 border-b border-rule px-3 pt-2">
            {(['controls', 'events'] as const).map((t) => (
              <button
                key={t}
                onClick={() => devStore.set({ panelTab: t })}
                aria-pressed={tab === t}
                className={`-mb-px border-b-2 px-3 pb-2 pt-1 text-sm font-medium ${tab === t ? 'border-accent text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
              >
                {t === 'controls' ? 'Controls' : `Event log (${count})`}
              </button>
            ))}
            <button
              className="icon-btn ml-auto h-8 w-8"
              aria-label="Close developer tools"
              onClick={() => {
                devStore.set({ panelOpen: false })
                button.current?.focus()
              }}
            >
              <X size={16} />
            </button>
          </div>
          {tab === 'controls' ? <Controls /> : <EventLogPanel />}
        </div>
      )}
    </>
  )
}

// --- Controls ---------------------------------------------------------------------------

const FAILURES: { key: keyof DevState; label: string; hint: string }[] = [
  { key: 'offline', label: 'Offline', hint: 'Extension: "Couldn\'t save, you\'re offline". Web: sync status offline, sync_failed on changes.' },
  { key: 'timeout', label: 'Server timeout', hint: 'Extension save gets no confirmation → "Couldn\'t save" + Retry.' },
  { key: 'rateLimited', label: 'Too many requests', hint: 'Send link / Resend → "Try again later" (web and popup).' },
  { key: 'qError', label: 'Q provider error', hint: 'Q answers fail → turtle error state, answer_failed.' },
]

function Controls() {
  const dev = useDev((s) => s)
  const userState = useProto((s) => s.userState)
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)

  async function apply(state: UserState, label: string) {
    setBusy(label)
    await resetDemo(state)
    setBusy(null)
    navigate('/library')
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 text-sm">
      <fieldset>
        <legend className="eyebrow mb-2">User state</legend>
        <div className="space-y-1.5">
          {(Object.keys(USER_STATE_LABEL) as UserState[]).map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-paper-deep">
              <input
                type="radio"
                name="user-state"
                checked={userState === s}
                onChange={() => apply(s, s)}
                className="accent-accent"
                disabled={!!busy}
              />
              <span className="flex-1">{USER_STATE_LABEL[s]}</span>
              {busy === s && <Loader2 size={14} className="animate-spin" />}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">Switching replaces the library with that user's data and signs you in.</p>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Annotations</legend>
        <Switch
          label="Show dev notes"
          hint='Yellow notes and "proposed / needs decision" badges across the app and the extension popup.'
          checked={dev.devNotes}
          onChange={(v) => devStore.set({ devNotes: v })}
        />
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Simulate failures</legend>
        <div className="space-y-2">
          {FAILURES.map((f) => (
            <Switch key={f.key} label={f.label} hint={f.hint} checked={!!dev[f.key]} onChange={(v) => devStore.set({ [f.key]: v } as Partial<DevState>)} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Demo data</legend>
        <button className="btn-secondary w-full" disabled={!!busy} onClick={() => apply(protoStore.get().userState, 'reset')}>
          {busy === 'reset' ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Reset demo data
        </button>
        <p className="mt-1.5 text-xs text-ink-faint">Restores the current user state's items, statuses and folders. The event log is kept.</p>
      </fieldset>

      <nav aria-label="Developer pages" className="space-y-1 border-t border-rule pt-4">
        <DevLink to="/screens">/screens — every screen and state</DevLink>
        <DevLink to="/events">/events — event dictionary and funnel</DevLink>
        <DevLink to="/demo-browser">/demo-browser — simulated Chrome extension</DevLink>
      </nav>
    </div>
  )
}

function DevLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-mono text-xs text-ink-soft hover:bg-paper-deep hover:text-ink">
      <ExternalLink size={13} /> {children}
    </Link>
  )
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-paper-deep">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${checked ? 'bg-accent' : 'bg-rule'}`}
      >
        <span className={`h-4 w-4 rounded-full bg-card shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-ink-faint">{hint}</span>}
      </span>
    </label>
  )
}

// --- Event log -------------------------------------------------------------------------------

export function EventLogPanel({ compact = false }: { compact?: boolean }) {
  const events = useEventLog()
  const [filter, setFilter] = useState('')
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const list = [...events].reverse()
    return f ? list.filter((e) => e.name.includes(f) || e.surface.includes(f)) : list
  }, [events, filter])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-rule px-3 py-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by event or surface"
          aria-label="Filter events"
          className="field h-8 py-1 font-mono text-xs"
        />
        <button className="btn-ghost shrink-0 px-2 py-1 text-xs" onClick={clearEventLog} aria-label="Clear event log">
          <Trash2 size={13} /> Clear
        </button>
      </div>
      <ol className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto font-mono text-[11.5px]" aria-live="polite" aria-label="Events, newest first">
        {shown.length === 0 && (
          <li className="px-4 py-8 text-center font-sans text-sm text-ink-faint">
            No events yet. Click around the library, reader, Q or /demo-browser.
          </li>
        )}
        {shown.map((e) => (
          <EventRow key={e.seq} e={e} compact={compact} />
        ))}
      </ol>
      <p className="border-t border-rule px-3 py-2 font-sans text-[11px] leading-snug text-ink-faint">
        Properties are IDs, counts, lengths and enums only — never article, highlight, note or Q text. Anything else is dropped by
        track() and shown in red.
      </p>
    </div>
  )
}

function EventRow({ e, compact }: { e: LoggedEvent; compact: boolean }) {
  const time = new Date(e.at).toLocaleTimeString(undefined, { hour12: false })
  const props = Object.entries(e.props)
  return (
    <li className="px-3 py-2" title={`anonymous_id=${e.anonymous_id} user_id=${e.user_id ?? '—'} session_id=${e.session_id} app_version=${e.app_version} source=${e.source}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="tabular-nums text-ink-faint">{time}</span>
        <span className="font-semibold text-ink">{e.name}</span>
        <span className={`rounded px-1.5 py-px text-[10px] font-sans font-semibold uppercase ${e.surface === 'extension' ? 'bg-sage-100 text-ink' : 'bg-paper-deep text-ink-soft'}`}>
          {e.surface}
        </span>
        {e.origin === 'proposed' && <span className="rounded bg-devnote-badge px-1.5 py-px font-sans text-[10px] font-semibold text-devnote-ink">proposed — not in PRD</span>}
        {e.origin === 'unknown' && <span className="rounded bg-danger-soft px-1.5 py-px font-sans text-[10px] font-semibold text-danger">not in dictionary</span>}
      </div>
      {props.length > 0 && (
        <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-ink-soft ${compact ? '' : 'pl-[4.5rem]'}`}>
          {props.map(([k, v]) => (
            <span key={k}>
              {k}=<span className="text-ink">{String(v)}</span>
            </span>
          ))}
        </div>
      )}
      {e.dropped && (
        <div className="mt-1 pl-[4.5rem] text-danger">
          dropped: {Object.entries(e.dropped).map(([k, why]) => `${k} (${why})`).join(', ')}
        </div>
      )}
    </li>
  )
}
