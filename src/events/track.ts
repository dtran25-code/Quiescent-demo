// track(name, props): the one way the prototype records an event.
//
// - Validates against the dictionary. A property that isn't declared, or whose
//   value doesn't fit its type, is DROPPED and listed in `dropped` so the Event
//   log shows the violation. This is how the privacy rule is enforced: a string
//   that isn't an id, a domain or a declared enum value can never be logged.
// - Logging never blocks the reader: every failure here is swallowed.
// - Rows go to an in-browser log (localStorage, last 300) shown in the Dev menu.

import { persistedStore, useStore } from '../proto/persist'
import { EVENT_BY_NAME, type EventDef, type PropSpec, type Surface } from './dictionary'

export type PropValue = string | number | boolean
export type Props = Record<string, PropValue | undefined>

export interface LoggedEvent {
  seq: number
  at: number
  name: string
  surface: Surface
  source: 'client' | 'server'
  origin: EventDef['origin'] | 'unknown'
  props: Record<string, PropValue>
  /** Properties removed by validation (name: reason). */
  dropped?: Record<string, string>
  /** Envelope every event carries (PRD: anonymous id, user id, session, app version). */
  anonymous_id: string
  user_id: string | null
  session_id: string
  app_version: string
}

interface LogState {
  seq: number
  events: LoggedEvent[]
  anonymousId: string
}

const MAX = 300
const APP_VERSION = 'proto-v2'
const SESSION_ID = randomId()

export const eventLog = persistedStore<LogState>('quiescent.v2.events', () => ({
  seq: 0,
  events: [],
  anonymousId: `anon_${randomId()}`,
}))

export const useEventLog = () => useStore(eventLog, (s) => s.events)

let userId: string | null = null
/** Identity stitching: called at sign-in (and with null at sign-out). */
export function identify(id: string | null) {
  userId = id
}

// The same event with the same props within 100 ms is one action reported twice
// (React StrictMode runs mount effects twice in development). Keep one.
let last = { key: '', at: 0 }

export function track(name: string, props: Props = {}, surface?: Surface) {
  try {
    const key = `${name}|${surface ?? ''}|${JSON.stringify(props)}`
    const now = Date.now()
    if (key === last.key && now - last.at < 100) return
    last = { key, at: now }
    const def = EVENT_BY_NAME.get(name)
    const clean: Record<string, PropValue> = {}
    const dropped: Record<string, string> = {}
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined) continue
      const spec = def?.props[key]
      if (!spec) {
        dropped[key] = 'not in dictionary'
        continue
      }
      const problem = check(spec, value)
      if (problem) dropped[key] = problem
      else clean[key] = typeof value === 'number' ? Math.round(value) : value
    }
    const resolvedSurface: Surface = surface ?? (def?.surface === 'extension' ? 'extension' : 'web')
    eventLog.set((s) => {
      const row: LoggedEvent = {
        seq: s.seq + 1,
        at: Date.now(),
        name,
        surface: resolvedSurface,
        source: def?.source ?? 'client',
        origin: def?.origin ?? 'unknown',
        props: clean,
        dropped: Object.keys(dropped).length ? dropped : undefined,
        anonymous_id: s.anonymousId,
        user_id: userId,
        session_id: SESSION_ID,
        app_version: APP_VERSION,
      }
      return { ...s, seq: row.seq, events: [...s.events, row].slice(-MAX) }
    })
    if (!def || Object.keys(dropped).length) console.warn(`[events] ${name}`, def ? { dropped } : 'is not in the dictionary')
  } catch {
    // Logging must never break the product.
  }
}

export function clearEventLog() {
  eventLog.set((s) => ({ ...s, events: [] }))
}

const ID = /^[A-Za-z0-9_-]{1,64}$/
const DOMAIN = /^(?=.{1,253}$)([a-z0-9-]+\.)*[a-z0-9-]+$/i

function check(spec: PropSpec, v: PropValue): string | null {
  switch (spec.type) {
    case 'enum':
      return typeof v === 'string' && spec.values.includes(v) ? null : 'not an allowed value'
    case 'id':
      return typeof v === 'string' && ID.test(v) ? null : 'not an id'
    case 'domain':
      return typeof v === 'string' && DOMAIN.test(v) ? null : 'not a bare domain'
    case 'bool':
      return typeof v === 'boolean' ? null : 'not a boolean'
    default:
      return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? null : 'not a non-negative number'
  }
}

function randomId() {
  try {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  } catch {
    return Math.random().toString(36).slice(2, 14)
  }
}

/** Hostname only, for source_domain. */
export function domainOf(url?: string) {
  if (!url) return undefined
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}
