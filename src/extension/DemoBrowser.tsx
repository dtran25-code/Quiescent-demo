// /demo-browser — a fake Chrome window with the Quiescent extension (Part B1).
//
// SIMULATION ONLY. The real build needs content extraction in the page, PDF
// handling, Chrome permissions and a Save API; estimate from the PRD, not from this.
//
// Saves flow into the real prototype state: a saved item appears in the Library
// (Read later), "Read now" opens it in the reader, and saving the same page again
// shows "Already in your library".
//
// URL params (used by /screens):
//   ?page=article|paywalled|online-pdf|local-pdf|blocked|non-article
//   &state=<popup state>   open the popup in that state with demo data
//   &utm=1                 add tracking parameters to the URL (duplicate detection still matches)

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, Lock, MoreVertical, Plus, Puzzle, RotateCw, X, Info } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { DevNote } from '../dev/DevNote'
import { addItem, getItem, getItems, newId, useSession } from '../storage/db'
import { articleFromText } from '../ingest/article'
import { readPdf } from '../ingest/pdf'
import { canonicalUrl } from '../proto/canonical'
import { registerSave, setStatus } from '../proto/actions'
import { devStore, metaOf, protoStore, useDevNotes } from '../proto/store'
import { domainOf, track } from '../events/track'
import { completeSignIn, signOutHere } from '../auth/auth'
import type { Item } from '../types'
import { ARTICLE_MIN_WORDS, PAGES, PAGE_ORDER, PARTIAL_UNDER_WORDS, wordCount, type DemoPage, type PageKind } from './pages'
import { Popup, type PopupState } from './Popup'

const SAVE_MS = 900
const TIMEOUT_DEMO_MS = 3000 // real rule: 10 s without confirmation
const HOLD_MS = 10 * 60 * 1000

interface Pending {
  page: PageKind
  url: string
  at: number
}
type Toast = { kind: 'saved'; itemId: string; title: string } | { kind: 'failed'; title: string }

export default function DemoBrowser() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const session = useSession()
  const devNotes = useDevNotes()

  const kind = (PAGE_ORDER.includes(params.get('page') as PageKind) ? params.get('page') : 'article') as PageKind
  const page = PAGES[kind]
  const utm = params.get('utm') === '1'
  const url = utm && page.url.startsWith('http') ? `${page.url}?utm_source=newsletter&utm_medium=email` : page.url
  const title = pageTitle(page)
  const source = sourceOf(page)

  const [popup, setPopup] = useState<PopupState | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const iconRef = useRef<HTMLButtonElement>(null)

  // extension_installed: the first time this browser opens the demo.
  useEffect(() => {
    try {
      if (!localStorage.getItem('quiescent.v2.extInstalled')) {
        localStorage.setItem('quiescent.v2.extInstalled', '1')
        track('extension_installed', {}, 'extension')
      }
    } catch {
      // Storage blocked: skip the one-time event.
    }
    if (!protoStore.get().extensionConnected) protoStore.set({ extensionConnected: true })
  }, [])

  // Forced popup state from /screens.
  useEffect(() => {
    const forced = params.get('state')
    if (forced) setPopup(demoState(forced))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setPage = (next: PageKind) => {
    setPopup(null)
    const p = new URLSearchParams(params)
    p.set('page', next)
    p.delete('state')
    setParams(p)
  }

  // --- opening the popup: decide the first state ---------------------------------

  async function openPopup() {
    if (popup) return closePopup()
    if (page.kind === 'blocked') return showFailure({ s: 'blocked' }, 'blocked_page')
    if (page.kind === 'local-pdf') return showFailure({ s: 'local_pdf' }, 'local_pdf')
    if (page.kind === 'non-article' || wordCount(page.text) < ARTICLE_MIN_WORDS && page.kind !== 'online-pdf')
      return showFailure({ s: 'cant_save' }, 'not_article')

    if (!session) {
      if (pending && Date.now() - pending.at < HOLD_MS && lastEmail.current)
        return setPopup({ s: 'waiting_signin', email: lastEmail.current, sentAt: sentAt.current })
      track('sign_in_prompt_shown', { trigger: 'first_save' }, 'extension')
      return setPopup({ s: 'signed_out', reason: pending ? 'pending_expired' : 'first_save', email: lastEmail.current })
    }
    const dup = await findDuplicate(url)
    if (dup) {
      track('save_duplicate', { item_id: dup, source_domain: domainOf(url) }, 'extension')
      return setPopup({ s: 'already', itemId: dup })
    }
    setPopup({ s: 'ready' })
  }

  function showFailure(state: PopupState, error_type: 'blocked_page' | 'local_pdf' | 'not_article') {
    track('save_failed', { error_type, source_domain: domainOf(url) }, 'extension')
    setPopup(state)
  }

  // Closing after "Saved to Read Later" without Read now files it to Read later.
  const closePopup = useCallback(() => {
    setPopup((p) => {
      if (p?.s === 'saved') track('save_popup_dismissed', { item_id: p.itemId }, 'extension')
      return null
    })
    iconRef.current?.focus()
  }, [])

  // Click outside the popup closes it (Chrome closes popups when focus leaves).
  const popupBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!popup) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!popupBox.current?.contains(t) && !iconRef.current?.contains(t)) closePopup()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [popup, closePopup])

  // --- saving -----------------------------------------------------------------------

  async function save(target: DemoPage, targetUrl: string): Promise<{ itemId: string; partial: boolean }> {
    track('save_clicked', { source_domain: domainOf(targetUrl) }, 'extension')
    const dev = devStore.get()
    if (dev.offline) {
      await wait(300)
      throw new SaveError('offline')
    }
    if (dev.timeout) {
      await wait(TIMEOUT_DEMO_MS)
      throw new SaveError('timeout')
    }
    await wait(SAVE_MS)
    const { item, words, file } = await buildItem(target, targetUrl)
    const partial = target.kind !== 'online-pdf' && words < PARTIAL_UNDER_WORDS
    await addItem(item, file)
    registerSave(item, 'extension', { canonical: canonicalUrl(targetUrl), wordCount: words })
    track(
      'save_confirmed',
      {
        item_id: item.id,
        content_type: item.type,
        source_domain: domainOf(targetUrl),
        word_count: words,
        partial,
        destination: 'read_later',
      },
      'extension',
    )
    return { itemId: item.id, partial }
  }

  async function add() {
    setPopup({ s: 'saving' })
    try {
      const result = await save(page, url)
      setPopup({ s: 'saved', ...result })
      track('save_shown', { item_id: result.itemId, shown_in: 'popup' }, 'extension')
    } catch (err) {
      const type = err instanceof SaveError ? err.type : 'server_error'
      track('save_failed', { error_type: type, source_domain: domainOf(url) }, 'extension')
      setPopup({ s: 'failed', offline: type === 'offline' })
    }
  }

  // "Read now" opens the reader full screen, like the reader's full screen button.
  // Browsers only allow full screen straight from a click, so it's requested before
  // anything else; if it's refused, the reader just opens in the window.
  async function readNow(itemId: string, from: 'popup' | 'duplicate' | 'notification') {
    document.documentElement
      .requestFullscreen?.()
      .then(() => track('fullscreen_entered', { item_id: itemId, from: 'extension' }))
      .catch(() => {})
    track('read_now_clicked', { item_id: itemId, from }, 'extension')
    if (!(await getItem(itemId))) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      return navigate('/library')
    }
    if (metaOf(itemId).status === 'read_later') setStatus(itemId, 'in_progress', 'read_now')
    navigate(`/read/${itemId}`, { state: { entry: from === 'notification' ? 'notification' : 'read_now' } })
  }

  // --- signing in from the popup (pending save held for 10 minutes) --------------------

  const lastEmail = useRef<string | undefined>(undefined)
  const sentAt = useRef(Date.now())

  function hold() {
    setPending({ page: page.kind, url, at: Date.now() })
  }

  async function finishSignIn(provider: 'google' | 'email') {
    // The sign-in tab opens, so Chrome closes the popup; a notification replaces it.
    setPopup(null)
    const held = pending ?? { page: page.kind, url, at: Date.now() }
    await wait(900)
    await completeSignIn(provider, provider === 'email' ? lastEmail.current : undefined, 'extension')
    setPending(null)
    const target = PAGES[held.page]
    try {
      const dup = await findDuplicate(held.url)
      if (dup) {
        track('save_duplicate', { item_id: dup, source_domain: domainOf(held.url) }, 'extension')
        setToast({ kind: 'saved', itemId: dup, title: pageTitle(target) })
        return
      }
      const result = await save(target, held.url)
      track('save_shown', { item_id: result.itemId, shown_in: 'notification' }, 'extension')
      setToast({ kind: 'saved', itemId: result.itemId, title: pageTitle(target) })
    } catch (err) {
      const type = err instanceof SaveError ? err.type : 'server_error'
      track('save_failed', { error_type: type, source_domain: domainOf(held.url) }, 'extension')
      setToast({ kind: 'failed', title: pageTitle(target) })
    }
  }

  function sendLink(email: string) {
    track('sign_in_started', { provider: 'email' }, 'extension')
    lastEmail.current = email
    hold()
    if (devStore.get().rateLimited) {
      track('sign_in_failed', { reason: 'rate_limited' }, 'extension')
      return setPopup({ s: 'too_many' })
    }
    sentAt.current = Date.now()
    setPopup({ s: 'check_email', email, sentAt: sentAt.current })
  }

  const handlers = {
    onClose: closePopup,
    onGoogle: () => {
      track('sign_in_started', { provider: 'google' }, 'extension')
      hold()
      finishSignIn('google')
    },
    onSendLink: sendLink,
    onResend: () => {
      track('sign_in_link_resent', { reason: popup?.s === 'link_expired' ? 'expired' : 'resend' }, 'extension')
      if (devStore.get().rateLimited) return setPopup({ s: 'too_many' })
      sentAt.current = Date.now()
      setPopup({ s: 'check_email', email: lastEmail.current ?? 'tam@usf.edu', sentAt: sentAt.current })
    },
    onDifferentEmail: () => setPopup({ s: 'signed_out', reason: 'first_save' }),
    onSimulateClick: () => finishSignIn('email'),
    onSimulateExpired: () => {
      track('sign_in_failed', { reason: 'link_expired' }, 'extension')
      setPopup({ s: 'link_expired' })
    },
    onSimulateHoldExpired: () => {
      track('sign_in_failed', { reason: 'abandoned' }, 'extension')
      setPending((p) => (p ? { ...p, at: Date.now() - HOLD_MS - 1 } : p))
      setPopup({ s: 'signed_out', reason: 'pending_expired', email: lastEmail.current })
    },
    onAdd: add,
    onReadNow: (from: 'popup' | 'duplicate') => {
      const id = popup && 'itemId' in popup ? popup.itemId : ''
      setPopup(null)
      readNow(id, from)
    },
    // "Open library" lands on the sub-view the item is in (Read later for a fresh save).
    onOpenLibrary: () => {
      const id = popup && 'itemId' in popup ? popup.itemId : null
      navigate(id ? `/library?status=${metaOf(id).status}` : '/library')
    },
    onRetry: add,
    onUpload: () => window.open('/library?upload=picker', '_blank', 'noopener'),
  }

  return (
    <div className="flex min-h-full flex-col bg-desktop">
      {/* Control bar (outside the fake window) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-rule bg-paper px-4 py-2.5 text-sm">
        <Link to="/library" className="btn-ghost px-2 py-1">
          <ArrowLeft size={15} /> Library
        </Link>
        <label className="flex items-center gap-2">
          <span className="font-medium">Simulated page</span>
          <select value={kind} onChange={(e) => setPage(e.target.value as PageKind)} className="field h-8 w-auto py-0">
            {PAGE_ORDER.map((k) => (
              <option key={k} value={k}>
                {PAGES[k].label}
              </option>
            ))}
          </select>
        </label>
        {page.url.startsWith('http') && (
          <label className="flex items-center gap-1.5 text-ink-soft">
            <input
              type="checkbox"
              checked={utm}
              className="accent-accent"
              onChange={(e) => {
                const p = new URLSearchParams(params)
                if (e.target.checked) p.set('utm', '1')
                else p.delete('utm')
                setParams(p)
              }}
            />
            Add ?utm_source= to the URL
          </label>
        )}
        <span className="ml-auto flex items-center gap-2 text-ink-soft">
          {session ? (
            <>
              Extension signed in{session.email ? ` as ${session.email}` : ''}
              <button className="btn-link text-xs" onClick={() => signOutHere('extension')}>
                Sign out
              </button>
            </>
          ) : (
            'Extension signed out'
          )}
        </span>
      </div>
      {devNotes && (
        <div className="px-4 pt-3">
          <DevNote>
            <b>Simulation only — real build requires content extraction, PDF handling, and Chrome permissions; estimate from
            the PRD, not this demo.</b> Click the Quiescent icon in the toolbar. Failures (offline, server timeout, too many
            requests) are switched on from the Dev menu. Server timeout is shortened to 3 s here (real rule: 10 s).
          </DevNote>
        </div>
      )}

      {/* The fake Chrome window */}
      <div className="flex flex-1 items-start justify-center p-4 sm:p-6">
        <div className="flex h-[calc(100vh-7rem)] min-h-[34rem] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-chrome-frame shadow-2xl ring-1 ring-black/10">
          {/* Tab strip */}
          <div className="flex items-end gap-1 px-3 pt-2" aria-hidden="true">
            <div className="flex max-w-60 items-center gap-2 rounded-t-lg bg-chrome-tab px-3 py-1.5 text-xs text-chrome-ink">
              <Favicon page={page} />
              <span className="truncate">{page.tabTitle}</span>
              <X size={12} className="ml-1 shrink-0 opacity-60" />
            </div>
            <Plus size={14} className="mb-2 ml-1 text-chrome-ink opacity-60" />
          </div>
          {/* Toolbar */}
          <div className="relative flex items-center gap-2 bg-chrome-toolbar px-3 py-1.5 text-chrome-ink">
            <ArrowLeft size={16} className="opacity-50" aria-hidden="true" />
            <ArrowRight size={16} className="opacity-30" aria-hidden="true" />
            <RotateCw size={15} className="opacity-60" aria-hidden="true" />
            <div className="mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-full bg-chrome-omnibox px-3.5 py-1.5 text-[13px]">
              {page.url.startsWith('https') ? <Lock size={12} className="shrink-0 opacity-60" /> : <Info size={12} className="shrink-0 opacity-60" />}
              <span className="truncate" aria-label="Address">
                {url}
              </span>
            </div>
            <Puzzle size={16} className="opacity-60" aria-hidden="true" />
            <div className="relative">
              <button
                ref={iconRef}
                onClick={openPopup}
                aria-label="Quiescent extension"
                aria-haspopup="dialog"
                aria-expanded={!!popup}
                className={`flex h-8 w-8 items-center justify-center rounded-full hover:bg-chrome-omnibox ${popup ? 'bg-chrome-omnibox' : ''}`}
              >
                <LogoMark size={18} />
              </button>
              {popup && (
                <div ref={popupBox} className="absolute right-0 top-full z-30 mt-1.5">
                  <Popup state={popup} title={title} source={source} h={handlers} />
                </div>
              )}
            </div>
            <MoreVertical size={16} className="opacity-60" aria-hidden="true" />
          </div>
          {/* Page */}
          <div className="relative flex-1 overflow-y-auto bg-white">
            <PageView page={page} />
          </div>
        </div>
      </div>

      {toast && <OsToast toast={toast} onClose={() => setToast(null)} onReadNow={(id) => readNow(id, 'notification')} />}
    </div>
  )
}

// --- helpers ---------------------------------------------------------------------------

class SaveError extends Error {
  type: 'offline' | 'timeout'
  constructor(type: 'offline' | 'timeout') {
    super(type)
    this.type = type
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pageTitle(page: DemoPage) {
  if (page.kind === 'online-pdf') return 'Interest Rates, Plainly'
  if (page.text) return page.text.split('\n')[0].replace(/^#\s*/, '')
  return page.tabTitle
}

function sourceOf(page: DemoPage) {
  const host = domainOf(page.url) ?? page.url
  return page.kind === 'online-pdf' ? `${host} · PDF` : host
}

async function findDuplicate(url: string): Promise<string | null> {
  const key = canonicalUrl(url)
  const live = new Set((await getItems()).map((i) => i.id))
  const meta = protoStore.get().meta
  return Object.keys(meta).find((id) => live.has(id) && meta[id].canonicalUrl === key) ?? null
}

async function buildItem(page: DemoPage, url: string): Promise<{ item: Item; words: number; file?: Blob }> {
  if (page.kind === 'online-pdf' && page.pdf) {
    const file = await fetch(`/samples/${page.pdf}`).then((r) => r.blob())
    const pdf = await readPdf(file, page.pdf)
    const item: Item = {
      id: newId(),
      title: pdf.title,
      type: 'pdf',
      sourceUrl: url,
      fileName: page.pdf,
      addedAt: Date.now(),
      progress: 0,
      chapters: pdf.chapters,
      pageCount: pdf.pageCount,
    }
    return { item, words: 0, file }
  }
  const article = articleFromText(page.text ?? '', page.tabTitle)
  const item: Item = {
    id: newId(),
    title: article.title,
    type: 'article',
    sourceUrl: url,
    addedAt: Date.now(),
    progress: 0,
    chapters: article.chapters,
    blocks: article.blocks,
  }
  return { item, words: wordCount(page.text) }
}

function demoState(name: string): PopupState | null {
  const now = Date.now()
  const map: Record<string, PopupState> = {
    'signed-out': { s: 'signed_out', reason: 'first_save' },
    'check-email': { s: 'check_email', email: 'tam@usf.edu', sentAt: now },
    'check-email-resend': { s: 'check_email', email: 'tam@usf.edu', sentAt: now - 61_000 },
    'waiting-signin': { s: 'waiting_signin', email: 'tam@usf.edu', sentAt: now - 20_000 },
    'link-expired': { s: 'link_expired' },
    'too-many': { s: 'too_many' },
    'pending-expired': { s: 'signed_out', reason: 'pending_expired', email: 'tam@usf.edu' },
    ready: { s: 'ready' },
    saving: { s: 'saving' },
    saved: { s: 'saved', itemId: 'demo-item', partial: false },
    'saved-partial': { s: 'saved', itemId: 'demo-item', partial: true },
    already: { s: 'already', itemId: 'sample-compounding' },
    'cant-save': { s: 'cant_save' },
    blocked: { s: 'blocked' },
    'local-pdf': { s: 'local_pdf' },
    failed: { s: 'failed', offline: false },
    'failed-offline': { s: 'failed', offline: true },
  }
  return map[name] ?? null
}

function Favicon({ page }: { page: DemoPage }) {
  const letter = page.kind === 'blocked' ? '◎' : page.kind.includes('pdf') ? 'P' : (domainOf(page.url) ?? '?')[0].toUpperCase()
  return (
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-chrome-frame text-[9px] font-bold" aria-hidden="true">
      {letter}
    </span>
  )
}

// --- page renderings ------------------------------------------------------------------------

function PageView({ page }: { page: DemoPage }) {
  if (page.kind === 'blocked')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-chrome-omnibox text-chrome-ink">
        <p className="font-sans text-5xl font-light tracking-tight opacity-70">Search</p>
        <div className="w-full max-w-md rounded-full bg-white px-5 py-3 text-sm opacity-70 shadow">Search or type a URL</div>
        <div className="flex gap-6 text-xs opacity-60">
          {['Mail', 'Calendar', 'Docs', 'Library'].map((s) => (
            <span key={s} className="flex flex-col items-center gap-1.5">
              <span className="h-10 w-10 rounded-full bg-white shadow-sm" />
              {s}
            </span>
          ))}
        </div>
      </div>
    )
  if (page.kind === 'local-pdf' || page.kind === 'online-pdf')
    return (
      <div className="min-h-full bg-chrome-ink/80 px-6 py-6">
        {[0, 1].map((n) => (
          <div key={n} className="mx-auto mb-5 aspect-[8.5/11] max-w-xl bg-white p-10 font-serif text-[13px] leading-relaxed text-ink shadow-lg">
            {n === 0 && (
              <p className="mb-4 text-xl font-semibold">{page.kind === 'online-pdf' ? 'Interest Rates, Plainly' : 'Week 7: Consensus and Replication'}</p>
            )}
            {Array.from({ length: n === 0 ? 9 : 14 }).map((_, i) => (
              <div key={i} className="mb-2 h-2 rounded bg-rule" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
            ))}
          </div>
        ))}
      </div>
    )
  if (page.kind === 'non-article')
    return (
      <div className="mx-auto max-w-3xl px-8 py-8 font-sans">
        <p className="border-b-4 border-ink pb-2 font-serif text-4xl font-bold">Example News</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {(page.text ?? '').split('\n').filter((l) => l.startsWith('- ')).map((l, i) => (
            <div key={i} className="rounded-lg border border-rule p-4">
              <div className="mb-3 h-24 rounded bg-paper-deep" />
              <p className="font-serif text-lg leading-snug">{l.slice(2)}</p>
            </div>
          ))}
        </div>
      </div>
    )
  // article / paywalled
  const lines = (page.text ?? '').split('\n\n')
  return (
    <article className="relative mx-auto max-w-2xl px-8 py-10 font-serif text-[17px] leading-relaxed text-ink">
      <p className="mb-6 font-sans text-xs uppercase tracking-wider text-ink-faint">{domainOf(page.url)}</p>
      {lines.map((block, i) =>
        block.startsWith('# ') ? (
          <h1 key={i} className="mb-6 text-4xl leading-tight">
            {block.slice(2)}
          </h1>
        ) : block.startsWith('## ') ? (
          <h2 key={i} className="mb-3 mt-8 text-2xl">
            {block.slice(3)}
          </h2>
        ) : block.startsWith('> ') ? (
          <blockquote key={i} className="my-5 border-l-2 border-ink-faint pl-4 italic text-ink-soft">
            {block.slice(2)}
          </blockquote>
        ) : (
          <p key={i} className="mb-4">
            {block}
          </p>
        ),
      )}
      {page.kind === 'paywalled' && (
        <div className="relative -mt-24 bg-gradient-to-b from-white/0 via-white to-white pt-24 text-center font-sans">
          <div className="mx-auto max-w-sm rounded-xl border border-rule bg-white p-6 shadow-lg">
            <p className="font-serif text-xl">The author made this story available to members only.</p>
            <p className="mt-2 text-sm text-ink-soft">Become a member to read the rest of it.</p>
            <span className="btn-primary mt-4 pointer-events-none">Become a member</span>
          </div>
        </div>
      )}
    </article>
  )
}

function OsToast({ toast, onClose, onReadNow }: { toast: Toast; onClose: () => void; onReadNow: (id: string) => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 12000)
    return () => window.clearTimeout(t)
  }, [onClose])
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 right-4 z-50 w-80 rounded-lg bg-toast p-3 font-sans text-toast-ink shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <LogoMark size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.kind === 'saved' ? 'Saved to Quiescent' : "Couldn't save"}</p>
          <p className="truncate text-xs opacity-80">{toast.title}</p>
        </div>
        <button onClick={onClose} aria-label="Dismiss notification" className="rounded p-0.5 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
      {toast.kind === 'saved' && (
        <button
          onClick={() => {
            onClose()
            onReadNow(toast.itemId)
          }}
          className="mt-2.5 w-full rounded-md bg-white/10 py-1.5 text-sm font-medium hover:bg-white/20"
        >
          Read now
        </button>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-wider opacity-50">Mock OS notification · Chrome</p>
    </div>
  )
}
