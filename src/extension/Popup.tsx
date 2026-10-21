// The extension popup (360 px), every state from the PRD's popup table and the
// wireframes in Prototype docs/reference/extension-wireframes/*.png, rebuilt with
// v2 tokens. Changes from the wireframes:
//   - DELETED "Read Later is full (10 of 10)" (queue cap dropped in v2)
//   - ADOPTED "Saved to Read Later": after a save, one primary "Read now";
//     closing the popup without it files the item to Read later.

import { useEffect, useRef, type ReactNode } from 'react'
import { AlertCircle, BookmarkCheck, CheckCircle2, FileUp, FileX, Globe, Loader2, PanelTop, WifiOff, X } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { Badge, DevNote } from '../dev/DevNote'
import { CheckEmail, LinkExpired, SignInOptions, TooManyRequests } from '../auth/SignInParts'

export type PopupState =
  | { s: 'signed_out'; reason: 'first_save' | 'session_expired' | 'pending_expired'; email?: string }
  | { s: 'check_email'; email: string; sentAt: number }
  | { s: 'waiting_signin'; email: string; sentAt: number }
  | { s: 'link_expired' }
  | { s: 'too_many' }
  | { s: 'ready' }
  | { s: 'saving' }
  | { s: 'saved'; itemId: string; partial: boolean }
  | { s: 'already'; itemId: string }
  | { s: 'cant_save' }
  | { s: 'blocked' }
  | { s: 'local_pdf' }
  | { s: 'failed'; offline: boolean }

export interface PopupHandlers {
  onClose: () => void
  onGoogle: () => void
  onSendLink: (email: string) => void
  onResend: () => void
  onDifferentEmail: () => void
  onSimulateClick: () => void
  onSimulateExpired: () => void
  onSimulateHoldExpired: () => void
  onAdd: () => void
  onReadNow: (from: 'popup' | 'duplicate') => void
  onOpenLibrary: () => void
  onRetry: () => void
  onUpload: () => void
}

export function Popup({ state, title, source, h }: { state: PopupState; title: string; source: string; h: PopupHandlers }) {
  const box = useRef<HTMLDivElement>(null)

  // Focus the primary action when the state changes ("Focus starts on Add to Quiescent, so Enter saves").
  useEffect(() => {
    const el = box.current
    if (!el) return
    const target =
      el.querySelector<HTMLElement>('[data-autofocus]') ??
      el.querySelector<HTMLElement>('.btn-primary:not([disabled])') ??
      el.querySelector<HTMLElement>('button:not([aria-label="Close popup"]), input, a[href]')
    target?.focus()
  }, [state.s])

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Quiescent extension"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          h.onClose()
        }
      }}
      className="w-popup rounded-xl bg-card font-sans text-ink shadow-2xl ring-1 ring-rule"
    >
      <div className="flex items-center gap-2 border-b border-rule px-4 py-2.5">
        <LogoMark size={22} />
        <span className="font-serif text-[15px] font-semibold">Quiescent</span>
        <button onClick={h.onClose} aria-label="Close popup" className="ml-auto rounded p-1 text-ink-faint hover:bg-paper-deep hover:text-ink">
          <X size={15} />
        </button>
      </div>
      <div className="px-4 pb-4 pt-4">
        <Body state={state} title={title} source={source} h={h} />
      </div>
    </div>
  )
}

function Body({ state, title, source, h }: { state: PopupState; title: string; source: string; h: PopupHandlers }) {
  switch (state.s) {
    case 'signed_out':
      return (
        <>
          <h2 className="mb-4 font-serif font-semibold text-xl">Sign in to save this article</h2>
          <SignInOptions compact onGoogle={h.onGoogle} onSendLink={h.onSendLink} defaultEmail={state.email ?? ''} />
          <Note>
            {state.reason === 'pending_expired'
              ? 'Pending save expired: sign-in took longer than 10 minutes, so the held article was discarded. Same screen, email kept.'
              : state.reason === 'session_expired'
                ? 'Session expired (30 days unused): same as first time; the article is held as a pending save.'
                : 'First save while signed out. The article is held for 10 min and saves itself after sign-in.'}{' '}
            <Badge kind="proposed" /> "or" divider and the "Email" label.
          </Note>
        </>
      )
    case 'check_email':
      return (
        <CheckEmail
          email={state.email}
          sentAt={state.sentAt}
          onResend={h.onResend}
          onDifferentEmail={h.onDifferentEmail}
          onSimulateClick={h.onSimulateClick}
          onSimulateExpired={h.onSimulateExpired}
        />
      )
    case 'waiting_signin':
      return (
        <div className="space-y-3">
          <ItemLine title={title} source={source} muted />
          <h2 className="font-serif font-semibold text-xl leading-snug">Finish signing in to save this article</h2>
          <p className="text-sm text-ink-soft">We sent a link to {state.email}. Held for 10 minutes.</p>
          <CheckEmail
            email={state.email}
            sentAt={state.sentAt}
            onResend={h.onResend}
            onDifferentEmail={h.onDifferentEmail}
            onSimulateClick={h.onSimulateClick}
            onSimulateExpired={h.onSimulateExpired}
          />
          <button className="btn-link text-xs" onClick={h.onSimulateHoldExpired}>
            Simulate 10 minutes passing
          </button>
          <Note>
            <Badge kind="proposed" /> Not in the spec: what the reader sees if they reopen the popup during the 10-minute hold.
          </Note>
        </div>
      )
    case 'link_expired':
      return (
        <>
          <LinkExpired onSendNew={h.onResend} />
          <Note>
            Likely unreachable here: the link opens in a browser tab and the popup is closed by then. The real "Link expired"
            screen is on the website (/signin?state=expired). Keep only if the popup checks the link on reopen.
          </Note>
        </>
      )
    case 'too_many':
      return (
        <>
          <TooManyRequests onDifferentEmail={h.onDifferentEmail} />
          <Note>
            <Badge kind="proposed" /> In the Accounts spec but missing from the popup table, though the popup sends links too.
          </Note>
        </>
      )
    case 'ready':
      return (
        <>
          <ItemLine title={title} source={source} />
          <button className="btn-primary mt-4 w-full py-2.5" onClick={h.onAdd}>
            Add to Quiescent
          </button>
          <Note>Page title from the page; site name is data. Online PDFs look the same (text read in the browser first, then by the server from the link).</Note>
        </>
      )
    case 'saving':
      return (
        <>
          <Heading icon={<Loader2 size={20} className="animate-spin text-ink-soft motion-reduce:animate-none" />}>Saving…</Heading>
          <ItemLine title={title} source={source} />
          {/* Same height as Saved so nothing jumps. */}
          <div className="mt-4 h-10" aria-hidden="true" />
          <Note>No buttons. "Saved" only after the server confirms (10 s limit). Target click-to-Saved under 3 s.</Note>
        </>
      )
    case 'saved':
      return (
        <>
          <Heading icon={<CheckCircle2 size={20} className="text-ok" />}>{state.partial ? "Saved what's visible" : 'Saved to Read Later'}</Heading>
          <ItemLine title={title} source={source} />
          <button className="btn-primary mt-4 w-full py-2.5" onClick={() => h.onReadNow('popup')}>
            Read now
          </button>
          <Note>
            <Badge kind="proposed" /> ADOPTED in v2: one decision instead of two ("Read now" / "Later"). Closing the popup
            without clicking files the item to Read later.
            {state.partial && ' Under 300 words (paywall preview): still a success, so calm green, not yellow.'}
          </Note>
        </>
      )
    case 'already':
      return (
        <>
          <Heading icon={<BookmarkCheck size={20} className="text-ink-soft" />}>Already in your library</Heading>
          <ItemLine title={title} source={source} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-primary" onClick={() => h.onReadNow('duplicate')}>
              Read now
            </button>
            <button className="btn-secondary" onClick={h.onOpenLibrary}>
              Open library
            </button>
          </div>
          <Note>
            Bookmark icon, not a check: nothing new happened. Matched on the canonical URL (tracking params, #, trailing slash
            and domain case ignored). "Read now" made primary to match Saved.
          </Note>
        </>
      )
    case 'cant_save':
      return (
        <>
          <Calm icon={<FileX size={18} />}>Can't save this page</Calm>
          <button className="btn-secondary mt-4 w-full" onClick={h.onOpenLibrary}>
            Library
          </button>
          <Note>Under 150 words of article text: home pages, feeds, search, YouTube. Nothing saved.</Note>
        </>
      )
    case 'blocked':
      return (
        <>
          <Calm icon={<PanelTop size={18} />}>Open an article to save it</Calm>
          <Note>chrome://, new tab, Web Store. No buttons; Esc closes. Chrome may not open the popup at all on some of these pages; Tech to confirm.</Note>
        </>
      )
    case 'local_pdf':
      return (
        <>
          <Calm icon={<FileUp size={18} />}>Upload PDFs in Quiescent</Calm>
          <button className="btn-primary mt-4 w-full" onClick={h.onUpload}>
            Upload
          </button>
          <Note>file:// PDF in Chrome's viewer. "Upload" opens Manual Upload on the website in a new tab.</Note>
        </>
      )
    case 'failed':
      return (
        <>
          <div role="alert" className="flex items-center gap-2.5 rounded-lg bg-warn-soft px-3.5 py-2.5">
            {state.offline ? <WifiOff size={18} className="text-warn" /> : <AlertCircle size={18} className="text-warn" />}
            <h2 className="font-serif text-lg font-semibold">{state.offline ? "Couldn't save, you're offline" : "Couldn't save"}</h2>
          </div>
          <div className="mt-3">
            <ItemLine title={title} source={source} />
          </div>
          <button className="btn-primary mt-4 w-full" onClick={h.onRetry}>
            Retry
          </button>
          <Note>
            {state.offline ? 'Different icon (no wifi) so the cause is clear without reading color.' : 'Timeout (no confirmation in 10 s) or server error.'} Nothing
            kept on the device; half-saved data removed. <Badge kind="proposed" /> Copy gap: say "Nothing was saved."
          </Note>
        </>
      )
  }
}

function Heading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2.5 font-serif font-semibold text-xl" role="status">
      {icon}
      {children}
    </h2>
  )
}

function Calm({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-ink">{icon}</div>
      <h2 className="mt-3 font-serif font-semibold text-xl" role="status">
        {children}
      </h2>
    </div>
  )
}

function ItemLine({ title, source, muted }: { title: string; source: string; muted?: boolean }) {
  return (
    <div className={`border-y border-rule py-2 ${muted ? 'text-ink-soft' : ''}`}>
      <p className="line-clamp-2 font-serif font-semibold text-lg leading-snug">{title}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint">
        <Globe size={11} /> {source}
      </p>
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <DevNote className="mt-4">{children}</DevNote>
}

