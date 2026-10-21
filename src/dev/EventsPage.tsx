// /events — the event dictionary (from src/events/dictionary.ts) and the funnel
// save → open → highlight/note → finish → return within 7 days.

import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { AREA_LABEL, EVENTS, FUNNEL, type Area, type PropSpec } from '../events/dictionary'
import { useEventLog } from '../events/track'

const AREAS: Area[] = ['extension', 'account', 'library', 'upload', 'reader', 'q']

export default function EventsPage() {
  const log = useEventLog()
  const prd = EVENTS.filter((e) => e.origin === 'prd').length

  // Live funnel from this browser's event log (items that reached each step).
  const funnel = useMemo(() => {
    const ids = (pred: (name: string, p: Record<string, unknown>) => boolean) =>
      new Set(log.filter((e) => pred(e.name, e.props)).map((e) => String(e.props.item_id)).filter((x) => x !== 'undefined'))
    const saved = ids((n) => n === 'save_confirmed' || n === 'upload_completed')
    const opened = ids((n) => n === 'item_opened')
    const noted = ids((n) => n === 'highlight_created' || n === 'note_edited')
    const finished = ids((n, p) => n === 'item_status_changed' && p.to === 'finished')
    const returned = ids((n, p) => n === 'item_opened' && p.open === 'reopen' && Number(p.days_since_last_open) <= 7)
    const steps = [saved, opened, noted, finished, returned]
    // Each step counts only items that also passed the step before.
    const out: number[] = []
    let pool = saved
    steps.forEach((s, i) => {
      pool = i === 0 ? s : new Set([...s].filter((x) => pool.has(x)))
      out.push(pool.size)
    })
    return out
  }, [log])

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <Link to="/library" className="btn-ghost -ml-3 mb-4 px-3 py-1">
          <ArrowLeft size={15} /> Back to the app
        </Link>
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <h1 className="font-serif font-semibold text-3xl">Event dictionary</h1>
        </div>
        <p className="mt-2 max-w-3xl text-ink-soft">
          {EVENTS.length} events: {prd} from the PRD's Event Logging catalog and feature sections, {EVENTS.length - prd} proposed for UI the PRD
          doesn't cover (folders, view switching, Most recent read, upload start, profile). Names are snake_case{' '}
          <code className="font-mono text-sm">object_action</code>. The Dev menu's Event log shows each one as it fires.
        </p>

        <section className="mt-6 rounded-xl border border-devnote-border bg-devnote p-5 text-sm text-devnote-ink">
          <h2 className="font-semibold">Privacy rule</h2>
          <p className="mt-1">
            Properties hold IDs, counts, lengths, durations, booleans and enums only. Never article text, highlight or note text,
            or Q prompts and answers. <code className="font-mono">track()</code> enforces it: there is no free-text property type,
            and anything that isn't a declared id, bare domain, enum value, number or boolean is dropped (and flagged red in the
            log). Every event also carries anonymous_id, user_id (after sign-in), session_id, app_version and surface.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-serif font-semibold text-2xl">Funnel</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Per item, each step counts only items that passed the step before. Live counts come from this browser's event log, so
            they start at zero; save something in /demo-browser and read it to watch them move.
          </p>
          <ol className="mt-4 grid gap-3 md:grid-cols-5">
            {FUNNEL.map((f, i) => (
              <li key={f.step} className="rounded-xl border border-rule bg-card p-4">
                <p className="eyebrow">Step {i + 1}</p>
                <p className="mt-1 font-serif font-semibold text-lg">{f.step}</p>
                <p className="mt-2 font-mono text-[11px] text-ink-soft">{f.events.join(' · ')}</p>
                <p className="mt-1 text-xs text-ink-faint">{f.rule}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{funnel[i]}</p>
                <p className="text-[11px] text-ink-faint">items in this browser</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl border border-rule bg-card p-5 text-sm">
            <p>
              <b>North Star: weekly recall</b> (readers coming back to and using what they read) —{' '}
              <span className="rounded bg-warn-soft px-1.5 py-0.5 font-semibold text-warn">not measurable in MVP</span>. Recall
              happens in the reader's head; nothing in the MVP observes it.
            </p>
            <p className="mt-2">Interim proxies, built from logged events:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
              <li>
                <b className="text-ink">Return to a past item's notes in a later week</b> (PRD proposed proxy):{' '}
                <code className="font-mono text-xs">side_panel_opened</code> with <code className="font-mono text-xs">days_since_first_highlight ≥ 7</code>.
              </li>
              <li>
                <b className="text-ink">Reopen within 7 days</b> (Reader supporting metric, 40% target):{' '}
                <code className="font-mono text-xs">item_opened</code> with <code className="font-mono text-xs">open = reopen</code> and{' '}
                <code className="font-mono text-xs">days_since_last_open ≤ 7</code>.
              </li>
              <li>
                <b className="text-ink">Reading with notes</b> (Reader primary, 50% target): share of{' '}
                <code className="font-mono text-xs">item_opened</code> items with a <code className="font-mono text-xs">highlight_created</code>.
              </li>
            </ul>
          </div>
        </section>

        {AREAS.map((area) => (
          <section key={area} className="mt-10">
            <h2 className="font-serif font-semibold text-2xl">{AREA_LABEL[area]}</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-rule bg-card">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="border-b border-rule bg-paper-deep/60 text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Event</th>
                    <th className="px-4 py-2.5 font-semibold">Trigger</th>
                    <th className="px-4 py-2.5 font-semibold">Surface</th>
                    <th className="px-4 py-2.5 font-semibold">Properties</th>
                    <th className="px-4 py-2.5 font-semibold">Metric it feeds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule align-top">
                  {EVENTS.filter((e) => e.area === area).map((e) => (
                    <tr key={e.name}>
                      <td className="px-4 py-3">
                        <code className="font-mono text-[13px] font-semibold">{e.name}</code>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="rounded bg-paper-deep px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-soft">{e.source}</span>
                          {e.origin === 'proposed' && (
                            <span className="rounded bg-devnote-badge px-1.5 py-0.5 text-[10px] font-semibold text-devnote-ink">proposed — not in PRD</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {e.trigger}
                        {e.note && <p className="mt-1 text-xs text-ink-faint">{e.note}</p>}
                      </td>
                      <td className="px-4 py-3 capitalize">{e.surface === 'both' ? 'web + extension' : e.surface}</td>
                      <td className="px-4 py-3">
                        {Object.keys(e.props).length === 0 ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {Object.entries(e.props).map(([k, spec]) => (
                              <li key={k}>
                                <code className="font-mono text-xs">{k}</code> <span className="text-xs text-ink-faint">{describe(spec)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{e.feeds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function describe(spec: PropSpec) {
  return spec.type === 'enum' ? spec.values.join(' | ') : spec.type
}
