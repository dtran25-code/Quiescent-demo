// Landing page (landing PRD). New and signed-out visitors only: App sends a
// signed-in visitor at / straight to the Library.
//
// One scroll, four sections, with a sticky nav (Save · Library · Ask Q! · Sign in · Add to Chrome):
//   #top      Intro: logo, "Read deeply in a noisy world", For intentional readers, Add to Chrome + Upload a PDF or EPUB
//   #save     Saving (extension + manual upload) and progress tracking, instruction video
//   #library  Library: statuses and folders
//   #ask-q    Q: highlight, ask, notes stay with the reading
//   footer    Privacy Policy, contact email
//
// Upload trial (user story A): pick a file → type and size are checked here, before sign-in →
// "Sign in to save this file" → after sign-in the same file is added (no second pick) →
// Library shows "First successful upload! Congrats!" then the one-time Add to Chrome tip.
// MOCKUP ONLY: sign-in is simulated, as on /signin.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, BookOpen, CheckCircle2, FileText, FolderOpen, Highlighter, Loader2, Mail, PlayCircle, Puzzle, StickyNote, Upload } from 'lucide-react'
import { Logo, LogoMark } from '../components/Logo'
import { Modal } from '../components/Modal'
import { CheckEmail, SignInOptions, SigningIn, TooManyRequests } from '../auth/SignInParts'
import { completeSignIn } from '../auth/auth'
import { QTurtle } from '../icons/QTurtle'
import { SteleIcon } from '../icons/SteleIcon'
import { Badge, DevNote } from '../dev/DevNote'
import { track } from '../events/track'
import { devStore } from '../proto/store'
import { getItems, useSession } from '../storage/db'
import { MAX_UPLOAD_MB, checkUpload, errorBody, fileType, formatMb, savePdfUpload } from '../library/uploadRules'
import { openChromeStore } from './chromeStore'

export const SUPPORT_EMAIL = 'quiescent.support@gmail.com'

type Placement = 'nav' | 'hero' | 'save_section' | 'footer'
type Section = 'intro' | 'save' | 'library' | 'q'

const NAV: { id: string; label: string }[] = [
  { id: 'save', label: 'Save' },
  { id: 'library', label: 'Library' },
  { id: 'ask-q', label: 'Ask Q!' },
]

/** State carried to the Library after the upload trial (read by FirstUploadWelcome). */
export interface FirstUploadState {
  firstUpload: { itemId: string; title: string; first: boolean }
}

export function LandingPage() {
  const navigate = useNavigate()
  const session = useSession()
  const fileInput = useRef<HTMLInputElement>(null)
  const [trialError, setTrialError] = useState<{ reason: 'wrong_type' | 'too_large'; name: string; bytes: number; epub: boolean } | null>(null)
  const [pending, setPending] = useState<File | null>(null)

  useEffect(() => {
    track('landing_viewed', {}, 'web')
  }, [])
  useSectionReach()

  function addToChrome(placement: Placement) {
    track('landing_cta_clicked', { cta: 'add_to_chrome', placement }, 'web')
    track('extension_install_clicked', { from: 'landing' }, 'web')
    openChromeStore()
  }

  function startUpload(placement: Placement) {
    track('landing_cta_clicked', { cta: 'upload', placement }, 'web')
    setTrialError(null)
    fileInput.current?.click()
  }

  function picked(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = ''
    if (!file) return
    const type = fileType(file)
    track('upload_started', { file_type: type, bytes: file.size, from: 'landing_trial' }, 'web')
    const problem = checkUpload(file)
    if (problem) {
      track('upload_failed', { file_type: type, error_type: problem, from: 'landing_trial' }, 'web')
      setTrialError({ reason: problem, name: file.name, bytes: file.size, epub: type === 'epub' })
      document.getElementById('trial-error')?.focus()
      return
    }
    setPending(file)
  }

  return (
    <div className="min-h-full bg-paper">
      <NavBar onSignIn={() => track('landing_cta_clicked', { cta: 'sign_in', placement: 'nav' }, 'web')} onAddToChrome={() => addToChrome('nav')} />

      <main>
        {/* --- Page 1: Intro ------------------------------------------------------------ */}
        <section id="top" data-section="intro" className="scroll-mt-16 px-4 sm:px-8">
          <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-6 [&>*]:min-w-0">
            <div>
              <Logo size="lg" />
              <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Read deeply in a noisy world</h1>
              <p className="mt-4 text-lg font-medium text-ink">For intentional readers</p>
              <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-ink-soft">
                Quiescent is one quiet place to save what you mean to read, keep your place, and understand it with Q, a reading
                companion. Made for students, researchers and anyone who reads to learn, not to scroll.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="btn-primary px-5 py-3 text-[15px]" onClick={() => addToChrome('hero')}>
                  <Puzzle size={18} /> Add to Chrome
                </button>
                <button className="btn-secondary px-5 py-3 text-[15px]" onClick={() => startUpload('hero')}>
                  <Upload size={18} /> Upload a PDF or EPUB
                </button>
              </div>
              <TrialError error={trialError} />
              <p className="mt-4 text-sm text-ink-soft">
                Already have an account?{' '}
                <Link
                  to="/signin"
                  className="btn-link"
                  onClick={() => track('landing_cta_clicked', { cta: 'sign_in', placement: 'hero' }, 'web')}
                >
                  Sign in
                </Link>
              </p>
              <DevNote className="mt-4 max-w-xl">
                Acceptance: logo, header, slogan, who-it's-for line and both buttons fit above the fold on a laptop (1280 × 720 and
                up). Upload checks type and size here, before sign-in. DEFAULT: PDF only up to {MAX_UPLOAD_MB} MB, as in the Library;
                the PRD button says "PDF or EPUB", so an EPUB gets "EPUB is coming soon". <Badge kind="needs decision" />
              </DevNote>
            </div>
            <ReaderMock />
          </div>
        </section>

        {/* --- Page 2: Saving + progress ----------------------------------------------- */}
        <Band id="save" section="save" tone="card">
          <SectionHeading eyebrow="Save" title="Save it now. Read it when you're ready." />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <CaseCard
              icon={<Puzzle size={22} />}
              label="From the web"
              title="Found something good, but no time right now?"
              body="Click the Q in Chrome. The article lands in your Read later list, clean and ready, paywalled pages included (what you can see)."
              action={
                <button className="btn-primary" onClick={() => addToChrome('save_section')}>
                  <Puzzle size={16} /> Add to Chrome
                </button>
              }
            />
            <CaseCard
              icon={<FileText size={22} />}
              label="From your computer"
              title="Have a PDF or EPUB to work through?"
              body="Upload it once. Quiescent keeps it in your library and remembers how far you got, chapter by chapter."
              action={
                <button className="btn-secondary" onClick={() => startUpload('save_section')}>
                  <Upload size={16} /> Upload a PDF or EPUB
                </button>
              }
            />
          </div>

          <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
              <h3 className="font-serif text-3xl font-semibold">Track your reading progress!</h3>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
                Stay in control of what you read. You won't lose your place or forget how far you got, even weeks later.
              </p>
              <ul className="mt-5 space-y-3 text-[15px]">
                <Bullet>Progress is a percentage, taken from your latest scroll position.</Bullet>
                <Bullet>Open a reading again and you are back where you stopped.</Bullet>
                <Bullet>Reach the end and Quiescent asks if you've finished, so your lists stay honest.</Bullet>
              </ul>
            </div>
            <ProgressMock />
          </div>

          <div className="mt-16">
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-rule bg-paper-deep">
              <div className="text-center">
                <PlayCircle size={56} strokeWidth={1.25} className="mx-auto text-ink" />
                <p className="mt-3 font-serif text-2xl font-semibold">See how it works</p>
                <p className="mt-1 text-sm text-ink-soft">Instruction video: save, read, highlight and ask Q, in under two minutes.</p>
              </div>
            </div>
            <DevNote className="mt-3">
              Instruction video placeholder (PRD Page 2). Swap in the recorded video; keep captions on. <Badge kind="not built" />
            </DevNote>
          </div>
        </Band>

        {/* --- Page 3: Library ------------------------------------------------------- */}
        <Band id="library" section="library">
          <SectionHeading
            eyebrow="Library"
            title="Everything you save, in order."
            body="Readings sort themselves by status, and you add folders for your own topics."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <StatusColumn label="In progress" tone="var(--color-status-progress)" items={[['How Raft keeps logs in agreement', 58], ['The Wealth of Nations', 23]]} />
            <StatusColumn label="Read later" tone="var(--color-status-later)" items={[['Why slow reading still matters', 0], ['Consistent hashing, explained', 0]]} />
            <StatusColumn label="Finished" tone="var(--color-status-finished)" items={[['Spaced repetition for the rest of us', 100]]} />
          </div>
          <div className="mt-6 rounded-2xl border border-rule bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <div className="md:w-2/5">
                <h3 className="flex items-center gap-2 font-serif text-2xl font-semibold">
                  <FolderOpen size={22} /> Folders for your topics
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  Make a folder for a class, a project or a question you're chasing. A reading can live in several folders, and you can
                  pick a folder right from the extension when you save.
                </p>
              </div>
              <div className="grid flex-1 grid-cols-3 gap-4">
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

        {/* --- Page 4: Q ------------------------------------------------------------- */}
        <Band id="ask-q" section="q" tone="card">
          <div className="grid items-center gap-12 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
              <div className="flex items-center gap-3">
                <QTurtle size={44} />
                <p className="eyebrow">Ask Q!</p>
              </div>
              <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight">Meet Q, your reading companion.</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
                Q is a small turtle from Viet Nam, where stone turtles have carried the names of scholars for centuries. Here, Q
                carries your questions, so you can keep reading.
              </p>
              <ul className="mt-6 space-y-3 text-[15px]">
                <Bullet>Highlight a passage and ask Q! to explain the idea, without leaving the page.</Bullet>
                <Bullet>Not sure what a word means? Q defines it in the context you're reading.</Bullet>
                <Bullet>Your highlights and notes stay with the reading, ready when you come back.</Bullet>
                <Bullet>Rather read alone? Switch Q off at any time.</Bullet>
              </ul>
              <DevNote className="mt-5">
                PRD: "Show only what the MVP model does": explain an idea, define a word, highlights and notes. The Viet Nam line is
                draft copy (the PRD text was cut off at "Q comes from Viet Nam…"). <Badge kind="needs decision" />
              </DevNote>
            </div>
            <QMock />
          </div>
        </Band>

        {/* --- Closing call to action ------------------------------------------------- */}
        <section className="px-4 py-20 text-center sm:px-8">
          <LogoMark size={48} />
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl font-semibold">Start with one reading.</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">Add Quiescent to Chrome, or upload a file you've been meaning to finish.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button className="btn-primary px-5 py-3 text-[15px]" onClick={() => addToChrome('footer')}>
              <Puzzle size={18} /> Add to Chrome
            </button>
            <button className="btn-secondary px-5 py-3 text-[15px]" onClick={() => startUpload('footer')}>
              <Upload size={18} /> Upload a PDF or EPUB
            </button>
          </div>
        </section>
      </main>

      <Footer />

      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf,application/epub+zip,.epub"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => picked(e.target.files?.[0])}
      />

      {pending && (
        <TrialSignIn
          file={pending}
          signedIn={!!session}
          onClose={() => setPending(null)}
          onSaved={(state) => navigate('/library', { replace: true, state })}
        />
      )}
    </div>
  )
}

// --- Nav -------------------------------------------------------------------------------

function scrollToId(id: string) {
  const el = id === 'top' ? document.body : document.getElementById(id)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (id === 'top') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  else el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`)
}

function NavBar({ onSignIn, onAddToChrome }: { onSignIn: () => void; onAddToChrome: () => void }) {
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
          <Link to="/signin" onClick={onSignIn} className="btn-ghost px-2.5 sm:px-4">
            Sign in
          </Link>
          <button className="btn-primary hidden sm:inline-flex" onClick={onAddToChrome}>
            <Puzzle size={16} /> Add to Chrome
          </button>
        </div>
      </nav>
    </header>
  )
}

// --- Upload trial ----------------------------------------------------------------------

function TrialError({ error }: { error: { reason: 'wrong_type' | 'too_large'; name: string; bytes: number; epub: boolean } | null }) {
  if (!error) return <div id="trial-error" tabIndex={-1} />
  const title = error.reason === 'too_large' ? 'That file is too large' : error.epub ? 'EPUB is coming soon' : 'PDF only for now'
  const body = error.epub && error.reason === 'wrong_type' ? `“${error.name}” is an EPUB. Choose a PDF for now.` : errorBody(error)
  return (
    <div id="trial-error" tabIndex={-1} role="alert" className="mt-4 flex max-w-xl gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3 text-sm text-accent-dark outline-none">
      <AlertCircle size={17} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5">{body}</p>
      </div>
    </div>
  )
}

type TrialStep = 'sign-in' | 'check-email' | 'signing-in' | 'rate-limited' | 'saving' | 'read-error'

/** "Sign in to save this file": the picked file is kept and added right after sign-in. */
function TrialSignIn({
  file,
  signedIn,
  onClose,
  onSaved,
}: {
  file: File
  signedIn: boolean
  onClose: () => void
  onSaved: (state: FirstUploadState) => void
}) {
  const [step, setStep] = useState<TrialStep>(signedIn ? 'saving' : 'sign-in')
  const [email, setEmail] = useState('')
  const [sentAt, setSentAt] = useState(() => Date.now())
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!signedIn) track('sign_in_prompt_shown', { trigger: 'landing_upload' }, 'web')
    // A visitor who is already signed in (dev preview at /landing) skips straight to saving.
    else if (!started.current) {
      started.current = true
      save()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    setStep('saving')
    try {
      const first = (await getItems()).length === 0
      const item = await savePdfUpload(file, 'landing_trial')
      onSaved({ firstUpload: { itemId: item.id, title: item.title, first } })
    } catch {
      track('upload_failed', { file_type: 'pdf', error_type: 'read_error', from: 'landing_trial' }, 'web')
      setStep('read-error')
    }
  }

  async function finish(provider: 'google' | 'email', withEmail?: string) {
    setBusy(provider)
    setStep('signing-in')
    await new Promise((r) => setTimeout(r, 900))
    await completeSignIn(provider, withEmail, 'web')
    await save()
  }

  function sendLink(address: string) {
    track('sign_in_started', { provider: 'email' }, 'web')
    setEmail(address)
    if (devStore.get().rateLimited) {
      track('sign_in_failed', { reason: 'rate_limited' }, 'web')
      return setStep('rate-limited')
    }
    setSentAt(Date.now())
    setStep('check-email')
  }

  const closable = step !== 'signing-in' && step !== 'saving'
  return (
    <Modal
      title={step === 'read-error' ? "Couldn't read that PDF" : 'Sign in to save this file'}
      onClose={() => {
        if (!closable) return
        if (step === 'sign-in' || step === 'check-email') track('sign_in_failed', { reason: 'abandoned' }, 'web')
        onClose()
      }}
    >
      <div className="mb-5 flex items-center gap-3 rounded-lg border border-rule bg-paper px-3.5 py-2.5">
        <FileText size={20} className="shrink-0 text-ink-soft" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-ink-faint">{formatMb(file.size)} · PDF</p>
        </div>
        {step !== 'read-error' && <CheckCircle2 size={18} className="ml-auto shrink-0 text-ok" aria-label="File checked" />}
      </div>

      {step === 'sign-in' && (
        <>
          <p className="mb-4 text-sm text-ink-soft">Your file is ready. Sign in and it goes straight into your library, no need to pick it again.</p>
          <SignInOptions
            busy={busy}
            onGoogle={() => {
              track('sign_in_started', { provider: 'google' }, 'web')
              finish('google')
            }}
            onSendLink={sendLink}
          />
        </>
      )}
      {step === 'check-email' && (
        <CheckEmail
          email={email}
          sentAt={sentAt}
          onResend={() => {
            track('sign_in_link_resent', { reason: 'resend' }, 'web')
            if (devStore.get().rateLimited) return setStep('rate-limited')
            setSentAt(Date.now())
          }}
          onDifferentEmail={() => setStep('sign-in')}
          onSimulateClick={() => finish('email', email)}
          onSimulateExpired={() => {
            track('sign_in_failed', { reason: 'link_expired' }, 'web')
            setStep('sign-in')
          }}
        />
      )}
      {step === 'signing-in' && <SigningIn />}
      {step === 'rate-limited' && <TooManyRequests onDifferentEmail={() => setStep('sign-in')} />}
      {step === 'saving' && (
        <div className="flex items-center gap-3 py-4" role="status">
          <Loader2 size={20} className="animate-spin text-accent" />
          <p className="text-sm font-medium">Adding it to your library…</p>
        </div>
      )}
      {step === 'read-error' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">The file may be damaged or password-protected. Nothing was added. You're signed in, so you can try another file from your library.</p>
          <Link to="/library" replace className="btn-primary w-full">
            Go to my library
          </Link>
        </div>
      )}
      <DevNote className="mt-4">
        Landing user story A. The file was checked before this appeared. On sign-in it's added without a second pick (in the real
        build: held in the browser until sign-in completes, including across the email link). Fires sign_in_prompt_shown with
        trigger = landing_upload, then upload_completed with from = landing_trial.
      </DevNote>
    </Modal>
  )
}

// --- Scroll reach ------------------------------------------------------------------------

/** landing_section_reached once per section per page view, when it reaches the top 60% of the screen. */
function useSectionReach() {
  useEffect(() => {
    const seen = new Set<Section>()
    const els = [...document.querySelectorAll<HTMLElement>('[data-section]')]
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
    els.forEach((el) => io.observe(el))
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

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-4xl font-semibold leading-tight">{title}</h2>
      {body && <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{body}</p>}
    </div>
  )
}

function CaseCard({ icon, label, title, body, action }: { icon: ReactNode; label: string; title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-rule bg-paper p-6 sm:p-7">
      <div className="flex items-center gap-2 text-ink-soft">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-100 text-ink">{icon}</span>
        <span className="eyebrow">{label}</span>
      </div>
      <h3 className="mt-4 font-serif text-2xl font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" />
      <span>{children}</span>
    </li>
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

function ProgressMock() {
  const rows: [string, string, number][] = [
    ['The Wealth of Nations', 'PDF · 9 pages', 23],
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
    <div className="rounded-2xl border border-rule bg-card p-5">
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

function QMock() {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-rule bg-paper p-6 sm:p-8">
      <p className="text-[15px] leading-relaxed text-ink-soft">
        The invisible hand describes how{' '}
        <span className="rounded-sm" style={{ background: 'var(--color-selection)' }}>
          individuals pursuing their own interest
        </span>{' '}
        can end up promoting the good of society.
      </p>
      <div className="mt-3 inline-flex items-center gap-1 rounded-lg bg-ink px-1.5 py-1 text-xs font-medium text-on-accent shadow-md">
        <span className="flex items-center gap-1 rounded px-2 py-1">
          <Highlighter size={13} /> Highlight
        </span>
        <span className="flex items-center gap-1 rounded px-2 py-1">
          <StickyNote size={13} /> Note
        </span>
        <span className="flex items-center gap-1.5 rounded bg-white/15 px-2 py-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-paper">
            <QTurtle size={14} />
          </span>
          Ask Q!
        </span>
      </div>
      <div className="mt-6 rounded-xl border border-rule bg-card p-4">
        <p className="ml-auto w-fit rounded-xl bg-paper-deep px-3 py-2 text-sm">Explain this idea simply</p>
        <div className="mt-3 flex gap-2.5">
          <QTurtle size={20} />
          <p className="text-sm leading-relaxed">
            Smith's point: when people trade to help themselves, they often meet other people's needs too, without anyone planning it.
            Think of a baker who bakes to earn a living, and the town gets bread.
          </p>
        </div>
      </div>
    </div>
  )
}

// --- Footer ------------------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-rule bg-card px-4 py-10 sm:px-8">
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
