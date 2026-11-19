// The Privacy Policy text, shown three ways:
//   - /privacy (quiescent.app/privacy): the page the Chrome Web Store and Google
//     sign-in settings link to.
//   - A window over the website (sign-in checkbox, landing footer).
//   - A panel inside the extension popup (sign-in checkbox). A real popup can't
//     draw outside its own frame, so it covers the popup instead of the page.
// Clicking "Privacy Policy" never leaves the screen: no new page, no new tab.
// The link keeps href="/privacy" so it still works if scripts fail, and opens
// the page on Ctrl/Cmd-click.

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import { Modal } from '../components/Modal'
import { CONSENT_COPY, PRIVACY_POLICY_PATH, PRIVACY_POLICY_VERSION, SUPPORT_EMAIL } from '../auth/consent'

/** The policy itself: effective date and every section. */
export function PolicyText() {
  const effective = new Date(`${PRIVACY_POLICY_VERSION}T12:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="text-[15px] leading-relaxed">
      <p className="mt-1 text-sm text-ink-faint">Effective {effective}</p>

      <p className="mt-5">
        Quiescent is a reading app: a website (quiescent.app) and a Chrome extension that save articles to your library so
        you can read them later. This policy explains what we collect, why, and the choices you have.
      </p>

      <PolicySection title="What we collect">
        <p>{CONSENT_COPY.collectsIntro}</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <strong>Your name, email and profile photo</strong>, from Google when you continue with Google, or your email
            address when you sign in with an email link. We use them to create and identify your account.
          </li>
          <li>
            <strong>The text, title and link of articles you save</strong>, and PDFs you upload, so you can read them in
            Quiescent on any computer you sign in on. Highlights and notes you make are stored with them.
          </li>
          <li>
            <strong>Where you stopped reading</strong>, so each item opens where you left off.
          </li>
          <li>
            <strong>How you use Quiescent, to improve it</strong>: events such as "article saved" or "item opened", with IDs,
            counts, durations and the website's domain. These events never contain the text of what you read, highlight or
            write.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="What the extension reads">
        <p>
          {CONSENT_COPY.reassurance.split('. ')[0]}. It does not watch your browsing, read other tabs or keep a history of
          the sites you visit. When you click the Q on a page, it reads that page's article text, title and link to save
          it. Before you sign in and agree to this policy, the extension collects and sends nothing.
        </p>
      </PolicySection>

      <PolicySection title="How we use it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To run your account and keep your library in sync across your computers.</li>
          <li>To show your saved articles, reading progress, highlights and notes back to you.</li>
          <li>To find and fix problems and to decide what to improve, using the usage events above.</li>
          <li>To send sign-in links and messages about your account. We don't send marketing email.</li>
        </ul>
      </PolicySection>

      <PolicySection title="Who we share it with">
        <p>
          <strong>We never sell your data</strong>, and we don't use it for advertising. We share it only with service
          providers that help us run Quiescent (hosting, sign-in and email delivery), under contracts that let them use it
          only for that, or when the law requires it.
        </p>
      </PolicySection>

      <PolicySection title="Keeping it and deleting it">
        <p>
          We keep your data while you have an account. Signing out removes your session from that computer; your library
          is kept. To delete your account and everything in it, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent-dark underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          . We delete it, or remove anything that identifies you, within 30 days.
        </p>
      </PolicySection>

      <PolicySection title="Security">
        <p>Your data is encrypted in transit. Access inside Quiescent is limited to the people who need it to run the service.</p>
      </PolicySection>

      <PolicySection title="Changes to this policy">
        <p>
          If we change what we collect or how we use it, we'll update this page and its date, and ask you to agree again
          before the change applies to you.
        </p>
      </PolicySection>

      <PolicySection title="Contact">
        <p>
          Questions about your data:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent-dark underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </PolicySection>
    </div>
  )
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <div className="mt-2 text-ink-soft [&_strong]:text-ink">{children}</div>
    </section>
  )
}

/**
 * "Privacy Policy" link that opens the policy on top of the current screen.
 * where="web": a window over the page. where="popup": a panel over the
 * extension popup (needs a `relative` ancestor: the popup frame).
 */
export function PrivacyPolicyLink({
  children,
  className,
  where = 'web',
}: {
  children: ReactNode
  className?: string
  where?: 'web' | 'popup'
}) {
  // Where the policy is drawn. Rendered through a portal so it's never inside
  // the checkbox's <label> (a click in the policy would tick the box).
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const close = () => setTarget(null)
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Ctrl/Cmd/Shift-click: let the browser open /privacy as usual.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    const frame = where === 'popup' ? e.currentTarget.closest<HTMLElement>('[data-popup-frame]') : null
    setTarget(frame ?? document.body)
  }
  return (
    <>
      <a href={PRIVACY_POLICY_PATH} onClick={onClick} aria-haspopup="dialog" className={className}>
        {children}
      </a>
      {target &&
        createPortal(where === 'popup' ? <PopupPolicyPanel onClose={close} /> : <PrivacyPolicyDialog onClose={close} />, target)}
    </>
  )
}

export function PrivacyPolicyDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Privacy Policy" onClose={onClose} width="max-w-2xl">
      <PolicyText />
      <div className="sticky -bottom-5 -mx-6 -mb-5 mt-8 border-t border-rule bg-paper px-6 py-4">
        <button className="btn-primary w-full sm:w-auto" onClick={onClose} data-autofocus>
          Close
        </button>
      </div>
    </Modal>
  )
}

/** Covers the extension popup; the sign-in screen (and the ticked box) stays underneath. */
function PopupPolicyPanel({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [opener] = useState(() => document.activeElement as HTMLElement | null)
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => opener?.focus?.()
  }, [opener])
  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label="Privacy Policy"
      onKeyDown={(e) => {
        // Esc goes back to sign-in instead of closing the whole popup.
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-xl bg-card"
    >
      <div className="flex items-center gap-2 border-b border-rule px-3 py-2.5">
        <button onClick={onClose} className="btn-ghost px-2 py-1" data-autofocus>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="font-serif text-[15px] font-semibold">Privacy Policy</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm [&_h2]:text-lg [&_section]:mt-5">
        <PolicyText />
      </div>
      <div className="border-t border-rule px-4 py-3">
        <button className="btn-primary w-full" onClick={onClose}>
          Back to sign in
        </button>
      </div>
    </div>
  )
}
