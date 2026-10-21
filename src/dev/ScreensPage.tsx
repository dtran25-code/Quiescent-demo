// /screens — direct links to every screen and state in the v2 brief (A6, A2, A3,
// A4, A5, B1). Screens that need a particular user state go through /dev/go,
// which switches state (resetting demo data) before opening the screen.

import { Link } from 'react-router'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { SteleIcon, type SteleState } from '../icons/SteleIcon'
import { QTurtle, type QState } from '../icons/QTurtle'
import { USER_STATE_LABEL, useProto, type UserState } from '../proto/store'
import { DevNote } from './DevNote'

interface Screen {
  name: string
  to: string
  /** Needs this user state; the link switches to it (resets demo data) if different. */
  state?: UserState
  note?: string
}

const go = (state: UserState, to: string) => `/dev/go?state=${state}&to=${encodeURIComponent(to)}`
const ext = (page: string, state?: string) => `/demo-browser?page=${page}${state ? `&state=${state}` : ''}`

const GROUPS: { title: string; brief: string; screens: Screen[] }[] = [
  {
    title: 'Web sign-in',
    brief: 'A6 · mirrors the extension',
    screens: [
      { name: 'Sign in — Continue with Google · email + Send link', to: '/signin' },
      { name: 'Check your email (Resend after 60 s, Use a different email)', to: '/signin?state=check-email' },
      { name: 'Signing you in…', to: '/signin?state=signing-in' },
      { name: 'Link expired → Send a new link', to: '/signin?state=expired' },
      { name: 'Too many requests → Try again later', to: '/signin?state=rate-limited' },
      { name: 'Signed out on this computer. Your library is kept.', to: '/signin?state=signed-out' },
    ],
  },
  {
    title: 'Library — By Status',
    brief: 'A2',
    screens: [
      { name: 'Empty library (new user): install the extension or upload', to: go('new', '/library'), state: 'new' },
      { name: 'By Status: In progress · Read later · Finished (no folders, so no By Folder tab)', to: go('existing', '/library'), state: 'existing' },
      { name: 'Card ⋯ menu → Add to folder (multi-select + New folder…)', to: go('existing_folders', '/library?addto=seed-hashing'), state: 'existing_folders' },
      { name: 'Card ⋯ menu → Remove from library (confirm)', to: go('existing', '/library?remove=seed-dull-tools'), state: 'existing' },
      { name: 'Create new folder modal (name + searchable checklist)', to: go('existing', '/library?create=1'), state: 'existing', note: 'Create one to see By Folder appear.' },
    ],
  },
  {
    title: 'Library — By Folder',
    brief: 'A2 · A3 · P0 pending dev estimate',
    screens: [
      { name: 'By Folder grid (steles; one empty folder)', to: go('existing_folders', '/library?view=folders'), state: 'existing_folders' },
      { name: 'Just-created folder highlighted', to: go('existing_folders', '/library?view=folders&new=folder-2'), state: 'existing_folders' },
      { name: 'Folder detail (breadcrumb, status badges)', to: go('existing_folders', '/library/folders/folder-1'), state: 'existing_folders' },
      { name: 'Folder detail — empty folder (blank slab)', to: go('existing_folders', '/library/folders/folder-4'), state: 'existing_folders' },
      { name: 'Folder detail → Add items', to: go('existing_folders', '/library/folders/folder-1?add=1'), state: 'existing_folders' },
      { name: 'Folder detail → Rename', to: go('existing_folders', '/library/folders/folder-2?rename=1'), state: 'existing_folders' },
      { name: 'Folder detail → Delete folder ("Items stay in your library")', to: go('existing_folders', '/library/folders/folder-3?delete=1'), state: 'existing_folders' },
    ],
  },
  {
    title: 'Upload',
    brief: 'A2 · PDF only, ≤ 25 MB',
    screens: [
      { name: 'Picker', to: '/library?upload=picker' },
      { name: 'Uploading', to: '/library?upload=uploading' },
      { name: 'Success (lands in Read later)', to: '/library?upload=success' },
      { name: 'Error — wrong type', to: '/library?upload=wrong-type' },
      { name: 'Error — too large', to: '/library?upload=too-large' },
    ],
  },
  {
    title: 'Reader',
    brief: 'unchanged apart from A1 sidebar + A4 turtle',
    screens: [
      { name: 'Article with highlights and notes', to: '/read/sample-compounding' },
      { name: 'Highlights panel open', to: '/read/seed-hashing?panel=1' },
      { name: 'Highlights panel — empty state', to: '/read/seed-prd?panel=1' },
      { name: 'PDF in the reader', to: '/read/sample-wealth' },
      { name: 'Vietnamese article (diacritics)', to: '/read/seed-tri-hoan' },
      { name: 'Item not in library', to: '/read/does-not-exist' },
    ],
  },
  {
    title: 'Sidebar & Account',
    brief: 'A1 · A5',
    screens: [
      { name: 'Most recent read — disabled ("Open something from your Library first")', to: go('new', '/library'), state: 'new', note: 'Hover or focus the second sidebar item.' },
      { name: 'Most recent read — enabled (opens the last-opened item, any status)', to: go('existing', '/library'), state: 'existing' },
      { name: 'Account (turn on dev notes for the badges)', to: '/account' },
      { name: 'Account — new user (extension not installed → Add to Chrome)', to: go('new', '/account'), state: 'new' },
    ],
  },
  {
    title: 'Simulated extension — pages',
    brief: 'B1 · click the toolbar icon',
    screens: [
      { name: 'Normal article', to: ext('article') },
      { name: 'Paywalled article (partial → "Saved what\'s visible")', to: ext('paywalled') },
      { name: 'Online PDF', to: ext('online-pdf') },
      { name: 'PDF on computer (file://)', to: ext('local-pdf') },
      { name: 'Blocked page (chrome://)', to: ext('blocked') },
      { name: 'Non-article page (homepage / feed)', to: ext('non-article') },
      { name: 'Same article with ?utm_source= (duplicate detection)', to: `${ext('article')}&utm=1` },
    ],
  },
  {
    title: 'Simulated extension — popup states',
    brief: 'B1 · every wireframe state, v2 tokens',
    screens: [
      { name: 'Signed out — Sign in to save this article', to: ext('article', 'signed-out') },
      { name: 'Check your email', to: ext('article', 'check-email') },
      { name: 'Check your email — Resend ready', to: ext('article', 'check-email-resend') },
      { name: 'Waiting for sign-in (popup reopened during the 10-min hold)', to: ext('article', 'waiting-signin') },
      { name: 'Link expired', to: ext('article', 'link-expired') },
      { name: 'Too many requests', to: ext('article', 'too-many') },
      { name: 'Pending save expired', to: ext('article', 'pending-expired') },
      { name: 'Ready — Add to Quiescent', to: ext('article', 'ready') },
      { name: 'Online PDF — Ready', to: ext('online-pdf', 'ready') },
      { name: 'Saving…', to: ext('article', 'saving') },
      { name: 'Saved to Read Later (adopted proposal: one "Read now")', to: ext('article', 'saved') },
      { name: "Saved what's visible (partial)", to: ext('paywalled', 'saved-partial') },
      { name: 'Already in your library', to: ext('article', 'already') },
      { name: "Can't save this page", to: ext('non-article', 'cant-save') },
      { name: 'Open an article to save it (blocked)', to: ext('blocked', 'blocked') },
      { name: 'Upload PDFs in Quiescent (file://)', to: ext('local-pdf', 'local-pdf') },
      { name: "Couldn't save (timeout / server error)", to: ext('article', 'failed') },
      { name: "Couldn't save, you're offline", to: ext('article', 'failed-offline') },
    ],
  },
  {
    title: 'Developer tools',
    brief: 'A7 · B2',
    screens: [
      { name: 'Event dictionary + funnel', to: '/events' },
      { name: 'Dev menu & live Event log: the "Dev" button, bottom-right of every page', to: '/library' },
    ],
  },
]

export default function ScreensPage() {
  const userState = useProto((s) => s.userState)
  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-8">
        <Link to="/library" className="btn-ghost -ml-3 mb-4 px-3 py-1">
          <ArrowLeft size={15} /> Back to the app
        </Link>
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <h1 className="font-serif text-3xl">Screens & states</h1>
        </div>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Every screen and state in the v2 prototype. Links marked with a user state switch to it first, which resets the demo
          data. Current state: <b>{USER_STATE_LABEL[userState]}</b>. The removed v1 Notes page and Sort/Filter controls are not
          listed because they no longer exist; the extension's "Read Later is full" state was deleted with the queue cap.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title} className="rounded-xl border border-rule bg-card p-5">
              <h2 className="font-serif text-xl">{g.title}</h2>
              <p className="eyebrow mt-0.5">{g.brief}</p>
              <ul className="mt-3 space-y-0.5">
                {g.screens.map((s) => (
                  <li key={s.name + s.to}>
                    <Link to={s.to} className="group flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-paper-deep">
                      <ExternalLink size={13} className="mt-1 shrink-0 text-ink-faint group-hover:text-accent" />
                      <span className="flex-1">
                        {s.name}
                        {s.note && <span className="block text-xs text-ink-faint">{s.note}</span>}
                      </span>
                      {s.state && s.state !== userState && (
                        <span className="shrink-0 rounded bg-devnote-badge px-1.5 py-0.5 text-[10px] font-semibold text-devnote-ink">
                          switches to: {s.state.replace('_', ' + ')}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <IconSpecimen />
      </div>
    </div>
  )
}

const STELE_STATES: SteleState[] = ['default', 'hover', 'selected', 'empty']
const Q_STATES: QState[] = ['idle', 'thinking', 'answered', 'error']

function IconSpecimen() {
  return (
    <section id="icons" className="mt-10 rounded-xl border border-rule bg-card p-6">
      <h2 className="font-serif text-2xl">Icons: the turtle stele and Q</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Original flat drawings sharing one hexagonal shell pattern and the stone tokens. Shown at real size (the size used in
        the app), on paper and on card backgrounds.
      </p>

      <h3 className="eyebrow mt-6">SteleIcon — folder (A3)</h3>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STELE_STATES.map((s) => (
          <figure key={s} className="flex flex-col items-center rounded-lg bg-paper p-4">
            <SteleIcon size={96} state={s} />
            <div className="mt-3 flex items-center gap-3 rounded bg-card px-3 py-2">
              <SteleIcon size={24} state={s} />
              <span className="text-sm">Interview prep</span>
            </div>
            <figcaption className="mt-2 font-mono text-xs text-ink-soft">state="{s}"</figcaption>
          </figure>
        ))}
      </div>

      <h3 className="eyebrow mt-8">QTurtle — Q (A4)</h3>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Q_STATES.map((s) => (
          <figure key={s} className="flex flex-col items-center rounded-lg bg-paper p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-rule">
              <QTurtle size={44} state={s} />
            </span>
            <div className="mt-3 flex items-start gap-2 rounded bg-card px-3 py-2 text-xs text-ink-soft">
              <QTurtle size={20} state={s} />
              <span>Here's a plainer version of that passage…</span>
            </div>
            <figcaption className="mt-2 font-mono text-xs text-ink-soft">state="{s}"</figcaption>
          </figure>
        ))}
      </div>

      <DevNote className="mt-6" always>
        <b>Components:</b> <code>&lt;SteleIcon size={'{96 | 24}'} state="default | hover | selected | empty" /&gt;</code> and{' '}
        <code>&lt;QTurtle size={'{44 | 20}'} state="idle | thinking | answered | error" /&gt;</code> in <code>src/icons/</code>. The
        24 px stele drops the inscription and shell detail; the folder name always sits below or beside the icon, never on the
        slab. Q's thinking state tucks the head and pulses the shell; with prefers-reduced-motion the head stays tucked and nothing
        moves. All colors come from tokens.css (stone-*, moss-*).
      </DevNote>
    </section>
  )
}
