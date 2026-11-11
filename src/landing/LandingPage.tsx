// Landing page (landing PRD, updated Nov 10, 2026). New and signed-out visitors only:
// App sends a signed-in visitor at / straight to the Library.
//
// One scroll, with a sticky nav (Save · Read · Library · Sign in · Add to Chrome):
//   #top          Intro: logo, "Read deeply in a noisy world.", who it's for, Get started + Add to Chrome
//   #save         Save from Chrome, instruction video
//   #read         Reader view (before/after), highlights and notes, track progress
//   #library      Library: statuses and folders
//   coming next   Upload PDFs and EPUBs, Ask Q! (two lines, no buttons or links, not in the nav)
//   footer        Privacy Policy, contact email
//
// Each section: the reader's problem in one line, how Quiescent solves it in one line, one visual.
// "Get started" and "Sign in" open the website sign-in (/signin); signing in creates the account.
// On a non-Chrome browser or a phone, "Add to Chrome" becomes "Available for Chrome on desktop."
// (?browser=other previews that on Chrome.)

import { useEffect, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BookOpen, FolderOpen, Mail, Monitor, PlayCircle, Puzzle, StickyNote } from 'lucide-react'
import { Logo, LogoMark } from '../components/Logo'
import { QTurtle } from '../icons/QTurtle'
import { SteleIcon } from '../icons/SteleIcon'
import { Badge, DevNote } from '../dev/DevNote'
import { track } from '../events/track'
import { openChromeStore } from './chromeStore'

export const SUPPORT_EMAIL = 'quiescent.support@gmail.com'

type Placement = 'nav' | 'hero' | 'closing'
type Section = 'intro' | 'save' | 'read' | 'library' | 'coming_next'

const NAV: { id: string; label: string }[] = [
  { id: 'save', label: 'Save' },
  { id: 'read', label: 'Read' },
  { id: 'library', label: 'Library' },
]

/** Desktop Chrome only: the extension can't be installed anywhere else. */
function isDesktopChrome() {
  const ua = navigator.userAgent
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[]; mobile?: boolean } }).userAgentData
  if (brands?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false
  if (brands?.brands) return brands.brands.some((b) => b.brand === 'Google Chrome' || b.brand === 'Chromium') && !/Edg\/|OPR\//.test(ua)
  return /Chrome\//.test(ua) && !/Edg\/|OPR\/|Brave/.test(ua)
}

export function LandingPage() {
  const [params] = useSearchParams()
  const canInstall = params.get('browser') !== 'other' && isDesktopChrome()

  useEffect(() => {
    track('landing_viewed', {}, 'web')
  }, [])
  useSectionReach()

  const addToChrome = (placement: Placement) => {
    track('landing_cta_clicked', { cta: 'add_to_chrome', placement }, 'web')
    track('extension_install_clicked', { from: 'landing' }, 'web')
    openChromeStore()
  }
  const getStarted = (placement: Placement) => track('landing_cta_clicked', { cta: 'get_started', placement }, 'web')

  return (
    <div className="min-h-full bg-paper">
      <NavBar canInstall={canInstall} onAddToChrome={() => addToChrome('nav')} />

      <main>
        {/* --- Page 1: Intro ------------------------------------------------------------ */}
        <section id="top" data-section="intro" className="scroll-mt-16 px-4 sm:px-8">
          <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-6 [&>*]:min-w-0">
            <div>
              <Logo size="lg" />
              <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Read deeply in a noisy world.</h1>
              <p className="mt-4 text-lg font-medium text-ink">For intentional readers.</p>
              <p className="mt-1 text-[17px] leading-relaxed text-ink-soft">For people who read to learn, not to scroll.</p>
              <CtaRow canInstall={canInstall} placement="hero" onGetStarted={getStarted} onAddToChrome={addToChrome} />
              <DevNote className="mt-4 max-w-xl">
                Acceptance: logo, header, slogan, who-it's-for line and both buttons fit above the fold on a laptop (1280 × 720 and
                up). "Get started" opens sign-in ("New here? Signing in creates your account."). Not desktop Chrome → "Available for
                Chrome on desktop." Preview it with <code>?browser=other</code>.
              </DevNote>
            </div>
            <ReaderMock />
          </div>
        </section>

        {/* --- Page 2: Save --------------------------------------------------------------- */}
        <Band id="save" section="save" tone="card">
          <SectionHeading
            eyebrow="Save"
            problem="Found something worth reading, but can't read it now?"
            solution="Click the Q in Chrome and it's saved to your library."
          />
          <SaveMock />

          <div className="mt-16">
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-rule bg-paper-deep">
              <div className="text-center">
                <PlayCircle size={56} strokeWidth={1.25} className="mx-auto text-ink" />
                <p className="mt-3 font-serif text-2xl font-semibold">See how it works</p>
                <p className="mt-1 text-sm text-ink-soft">Instruction video</p>
              </div>
            </div>
            <DevNote className="mt-3">
              Instruction video placeholder (PRD Page 2). Swap in the recorded video; keep captions on. <Badge kind="not built" />
            </DevNote>
          </div>
        </Band>

        {/* --- Page 3: Read (reader view + progress) ------------------------------------- */}
        <Band id="read" section="read">
          <SectionHeading
            eyebrow="Read"
            problem="Hard to focus when the article is buried in ads and pop-ups?"
            solution="Reader view shows just the text, so you can read, highlight and take notes in one calm place."
          />
          <BeforeAfterMock />

          <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
              <h3 className="font-serif text-3xl font-semibold">Track your reading progress!</h3>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">Lost your place, or forgot how far you got?</p>
              <p className="mt-1 text-[17px] leading-relaxed text-ink">
                Every reading shows your progress as a %, so you stay in control of what you read.
              </p>
              <DevNote className="mt-4">
                How the saved point is chosen: copy to confirm with Tech before writing it (PRD). <Badge kind="needs decision" />
              </DevNote>
            </div>
            <ProgressMock />
          </div>

        </Band>

        {/* --- Page 4: Library ------------------------------------------------------- */}
        <Band id="library" section="library" tone="card">
          <SectionHeading
            eyebrow="Library"
            problem="Lost track of what you're reading, and what's next?"
            solution="Your Library keeps it in order: Reading, Read Later, and Finished, plus folders for your own topics."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <StatusColumn label="Reading" tone="var(--color-status-progress)" items={[['How Raft keeps logs in agreement', 58], ['The Wealth of Nations', 23]]} />
            <StatusColumn label="Read Later" tone="var(--color-status-later)" items={[['Why slow reading still matters', 0], ['Consistent hashing, explained', 0]]} />
            <StatusColumn label="Finished" tone="var(--color-status-finished)" items={[['Spaced repetition for the rest of us', 100]]} />
          </div>
          <div className="mt-6 rounded-2xl border border-rule bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <p className="flex items-center gap-2 font-serif text-2xl font-semibold md:w-2/5">
                <FolderOpen size={22} /> Folders for your own topics
              </p>
              <div className="grid flex-1 grid-cols-3 gap-4" aria-hidden="true">
                {[
                  ['Econ 301', 4],
                  ['Interview prep', 4],
                  ['Thesis, someday', 0],
                ].map(([name, n]) => (
                  <div key={name} className="flex flex-col items-center text-center">
                    <SteleIcon size={72} state={n ? 'default' : 'empty'} />
                    <p className="mt-2 text-sm font-medium">{name}</p>
                    <p className="text-xs text-ink-faint">{n ? `${n} readings` : 'Empty'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Band>

        {/* --- Coming next (no buttons, links, dates or visuals; not in the nav) ------------ */}
        <section data-section="coming_next" className="border-t border-rule px-4 py-14 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Coming next</p>
            <ul className="mt-4 space-y-2 text-[17px] text-ink-soft">
              <li>Upload your own PDFs and EPUBs, and read them alongside your articles.</li>
              <li>Ask Q!: highlight a passage and ask Q! to explain it.</li>
            </ul>
          </div>
        </section>

        {/* --- Closing call to action ------------------------------------------------- */}
        <section className="border-t border-rule bg-card px-4 py-20 text-center sm:px-8">
          <div className="flex justify-center">
            <LogoMark size={48} />
          </div>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl font-semibold">Start with one reading.</h2>
          <div className="flex justify-center">
            <CtaRow canInstall={canInstall} placement="closing" onGetStarted={getStarted} onAddToChrome={addToChrome} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

// --- Buttons and nav -------------------------------------------------------------------

function CtaRow({
  canInstall,
  placement,
  onGetStarted,
  onAddToChrome,
}: {
  canInstall: boolean
  placement: Placement
  onGetStarted: (p: Placement) => void
  onAddToChrome: (p: Placement) => void
}) {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      <Link to="/signin" className="btn-primary px-6 py-3 text-[15px]" onClick={() => onGetStarted(placement)}>
        Get started
      </Link>
      {canInstall ? (
        <button className="btn-secondary px-5 py-3 text-[15px]" onClick={() => onAddToChrome(placement)}>
          <Puzzle size={18} /> Add to Chrome
        </button>
      ) : (
        <ChromeOnly />
      )}
    </div>
  )
}

function ChromeOnly() {
  return (
    <p className="inline-flex items-center gap-2 text-sm text-ink-soft">
      <Monitor size={16} /> Available for Chrome on desktop.
    </p>
  )
}

function scrollToId(id: string) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (id === 'top') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  else document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', id === 'top' ? location.pathname + location.search : `#${id}`)
}

function NavBar({ canInstall, onAddToChrome }: { canInstall: boolean; onAddToChrome: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-6 sm:px-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            scrollToId('top')
          }}
          className="flex shrink-0 items-center gap-2 rounded-lg"
          aria-label="Quiescent, back to top"
        >
          <LogoMark size={30} />
          <span className="hidden font-serif text-2xl font-semibold tracking-tight sm:inline">Quiescent</span>
        </a>
        <ul className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          {NAV.map((n) => (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToId(n.id)
                }}
                className="whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink sm:px-3"
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            to="/signin"
            onClick={() => track('landing_cta_clicked', { cta: 'sign_in', placement: 'nav' }, 'web')}
            className="btn-ghost px-2.5 sm:px-4"
          >
            Sign in
          </Link>
          {canInstall && (
            <button className="btn-primary hidden sm:inline-flex" onClick={onAddToChrome}>
              <Puzzle size={16} /> Add to Chrome
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}

// --- Scroll reach ------------------------------------------------------------------------

/** landing_section_reached once per section per page view, when it reaches the top 60% of the screen. */
function useSectionReach() {
  useEffect(() => {
    const seen = new Set<Section>()
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const section = (e.target as HTMLElement).dataset.section as Section
          if (e.isIntersecting && !seen.has(section)) {
            seen.add(section)
            track('landing_section_reached', { section }, 'web')
          }
        }
      },
      { rootMargin: '0px 0px -40% 0px' },
    )
    document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

// --- Layout pieces -------------------------------------------------------------------------

function Band({ id, section, tone, children }: { id: string; section: Section; tone?: 'card'; children: ReactNode }) {
  return (
    <section id={id} data-section={section} className={`scroll-mt-16 border-t border-rule px-4 py-20 sm:px-8 sm:py-24 ${tone === 'card' ? 'bg-card' : ''}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

/** Problem in one line, solution in one line. */
function SectionHeading({ eyebrow, problem, solution }: { eyebrow: string; problem: string; solution: string }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-4xl font-semibold leading-tight">{problem}</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{solution}</p>
    </div>
  )
}

function Bar({ pct, color = 'var(--color-accent)' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-rule" aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// --- Illustrations (built from the app's own tokens; decorative) --------------------------------

function ReaderMock() {
  return (
    <div aria-hidden="true" className="relative hidden lg:block">
      <div className="overflow-hidden rounded-2xl border border-rule bg-card shadow-[0_24px_60px_-30px_var(--color-shadow)]">
        <div className="h-1 bg-rule">
          <div className="h-full w-[42%] bg-accent" />
        </div>
        <div className="px-8 pb-8 pt-6">
          <p className="eyebrow">aeon.co · 12 min read</p>
          <p className="mt-2 font-serif text-3xl font-semibold leading-tight">Why slow reading still matters</p>
          <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-ink-soft">
            <p>
              Attention is not a fixed supply we spend, but a habit we build. Each time we stay with a hard paragraph,{' '}
              <mark className="rh-mark has-note">we train the patience that understanding needs</mark>, and the next one comes a little
              easier.
            </p>
            <p>Skimming feels efficient. It is, for finding. It is not, for keeping.</p>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-ink-faint">
            <span>Section 2 / 6 · 42%</span>
            <span className="flex items-center gap-1.5">
              <StickyNote size={14} /> 1 note
            </span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-xl border border-rule bg-card px-4 py-3 shadow-lg">
        <QTurtle size={36} />
        <div>
          <p className="text-sm font-medium">Saved to Read later</p>
          <p className="text-xs text-ink-faint">From Chrome, in one click</p>
        </div>
      </div>
    </div>
  )
}

/** A browser toolbar with the Q, and the "Saved to Read later" popup. */
function SaveMock() {
  return (
    <div aria-hidden="true" className="mt-10 overflow-hidden rounded-2xl border border-rule bg-paper">
      <div className="flex items-center gap-3 border-b border-rule bg-card px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
        </div>
        <div className="min-w-0 flex-1 truncate rounded-full bg-paper px-4 py-1 text-xs text-ink-faint">aeon.co/essays/why-slow-reading-still-matters</div>
        <span className="rounded-md bg-sage-100 p-0.5 ring-2 ring-accent">
          <LogoMark size={22} />
        </span>
      </div>
      <div className="relative grid gap-6 p-6 sm:grid-cols-[1fr_18rem] sm:p-8">
        <div className="space-y-3">
          <p className="font-serif text-2xl font-semibold">Why slow reading still matters</p>
          {[92, 100, 84, 96, 70].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full bg-rule" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="rounded-xl border border-rule bg-card p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <QTurtle size={28} />
            <p className="font-medium">Saved to Read later</p>
          </div>
          <p className="mt-2 text-sm text-ink-soft">Why slow reading still matters</p>
          <div className="mt-4 rounded-lg bg-accent px-3 py-2 text-center text-sm font-medium text-on-accent">Read now</div>
        </div>
      </div>
    </div>
  )
}

/** The same article before (ads, pop-up, sidebar) and in reader view (text, a highlight, a note). */
function BeforeAfterMock() {
  const lines = (widths: number[]) =>
    widths.map((w, i) => <div key={i} className="h-2 rounded-full bg-rule" style={{ width: `${w}%` }} />)
  return (
    <div aria-hidden="true" className="mt-10 grid gap-5 md:grid-cols-2">
      <figure className="flex flex-col">
        <figcaption className="eyebrow mb-2">Before</figcaption>
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-rule bg-card p-4">
          <div className="mb-3 flex h-10 items-center justify-center rounded-md bg-danger-soft text-[11px] font-semibold uppercase tracking-wider text-danger">
            Ad
          </div>
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <div className="space-y-2.5">
              <p className="font-serif text-lg font-semibold leading-tight">Why slow reading still matters</p>
              {lines([96, 88, 100, 72])}
              <div className="flex h-14 items-center justify-center rounded-md bg-danger-soft text-[11px] font-semibold uppercase tracking-wider text-danger">
                Ad
              </div>
              {lines([92, 80])}
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-md bg-warn-soft" />
              <div className="h-12 rounded-md bg-stone-100" />
              <div className="h-16 rounded-md bg-danger-soft" />
            </div>
          </div>
          <div className="absolute inset-x-6 bottom-4 rounded-lg border border-rule bg-card px-3 py-2 text-xs text-ink-soft shadow-lg">
            Subscribe to our newsletter! <span className="float-right">✕</span>
          </div>
        </div>
      </figure>
      <figure className="flex flex-col">
        <figcaption className="eyebrow mb-2">In reader view</figcaption>
        <div className="flex-1 overflow-hidden rounded-2xl border border-rule bg-card">
          <div className="h-1 bg-rule">
            <div className="h-full w-[42%] bg-accent" />
          </div>
          <div className="px-6 pb-6 pt-5">
            <p className="font-serif text-2xl font-semibold leading-tight">Why slow reading still matters</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Attention is not a fixed supply we spend, but a habit we build. Each time we stay with a hard paragraph,{' '}
              <mark className="rh-mark has-note">we train the patience that understanding needs</mark>.
            </p>
            <div className="mt-4 rounded-lg border border-rule bg-paper px-3 py-2 text-xs text-ink">
              <span className="font-semibold">Note:</span> compare with the chapter on deep work
            </div>
            <p className="mt-4 text-xs text-ink-faint">Section 2 / 6 · 42%</p>
          </div>
        </div>
      </figure>
    </div>
  )
}

function ProgressMock() {
  const rows: [string, string, number][] = [
    ['The Wealth of Nations', 'Article · 18 min', 23],
    ['How Raft keeps logs in agreement', 'Article · 14 min', 58],
    ['Spaced repetition for the rest of us', 'Article · 9 min', 100],
  ]
  return (
    <div aria-hidden="true" className="space-y-3 rounded-2xl border border-rule bg-paper p-5">
      {rows.map(([title, meta, pct]) => (
        <div key={title} className="rounded-xl border border-rule bg-card px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-serif text-lg font-semibold">{title}</p>
            <span className="shrink-0 text-sm tabular-nums text-ink-soft">{pct}%</span>
          </div>
          <p className="mb-2 text-xs text-ink-faint">{meta}</p>
          <Bar pct={pct} color={pct === 100 ? 'var(--color-status-finished)' : undefined} />
        </div>
      ))}
    </div>
  )
}

function StatusColumn({ label, tone, items }: { label: string; tone: string; items: [string, number][] }) {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-rule bg-card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className="h-2 w-2 rounded-full" style={{ background: tone }} />
        {label}
      </p>
      <ul className="mt-4 space-y-3">
        {items.map(([title, pct]) => (
          <li key={title} className="rounded-lg border border-rule bg-paper px-3.5 py-3">
            <p className="flex items-start gap-2 text-sm font-medium">
              <BookOpen size={15} className="mt-0.5 shrink-0 text-ink-faint" />
              {title}
            </p>
            {pct > 0 && pct < 100 && (
              <div className="mt-2">
                <Bar pct={pct} color={tone} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// --- Footer ------------------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-rule bg-paper px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-2 text-sm text-ink-soft">Read deeply in a noisy world.</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <Link to="/privacy" className="btn-link">
              Privacy Policy
            </Link>
          </li>
          <li>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-link">
              <Mail size={14} /> {SUPPORT_EMAIL}
            </a>
          </li>
        </ul>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-ink-faint">© {new Date().getFullYear()} Quiescent</p>
    </footer>
  )
}

/** Placeholder until the policy is written. */
export function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col items-center bg-paper px-6 py-16">
      <Link to="/" aria-label="Quiescent home">
        <Logo />
      </Link>
      <div className="mt-10 w-full max-w-xl rounded-2xl border border-rule bg-card p-8">
        <h1 className="font-serif text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-3 text-ink-soft">
          The full policy is on its way. Questions in the meantime:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-link">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <DevNote className="mt-5">Placeholder page: the Privacy Policy text isn't written yet. <Badge kind="not built" /></DevNote>
      </div>
    </div>
  )
}
