// MOCKUP ONLY: every option "signs in" instantly. No real identity provider,
// password check or account is involved.

import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { FileText, Loader2, Mail, Newspaper } from 'lucide-react'
import { Logo } from '../components/Logo'
import { commitPending, getPending, signIn, type PendingUpload, type SignInMethod } from '../storage/db'

export function LoginPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingUpload | null>()
  const [busy, setBusy] = useState<SignInMethod | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    getPending().then((p) => setPending(p ?? null))
  }, [])

  async function finish(method: SignInMethod, withEmail?: string) {
    setBusy(method)
    // Short pause so it feels like something happened.
    await new Promise((r) => setTimeout(r, 600))
    await commitPending()
    await signIn(method, withEmail)
    navigate('/library', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-16">
      <Link to="/" aria-label="ReadHub home">
        <Logo />
      </Link>

      <div className="mt-10 w-full max-w-sm">
        <h1 className="text-center font-serif text-2xl">
          {pending ? 'Sign in to save your reading' : 'Sign in to ReadHub'}
        </h1>

        {pending && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-rule bg-white/60 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper-deep text-ink-soft">
              {pending.item.type === 'pdf' ? <FileText size={17} /> : <Newspaper size={17} />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif">{pending.item.title}</p>
              <p className="text-xs text-ink-faint">
                {pending.item.type === 'pdf' ? `PDF · ${pending.item.pageCount} pages` : 'Article'} ·{' '}
                {pending.item.chapters.length} sections
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2.5">
          <ProviderButton icon={<GoogleIcon />} label="Continue with Google" busy={busy === 'google'} disabled={!!busy} onClick={() => finish('google')} />
          <ProviderButton icon={<AppleIcon />} label="Continue with Apple" busy={busy === 'apple'} disabled={!!busy} onClick={() => finish('apple')} />
          <ProviderButton icon={<MicrosoftIcon />} label="Continue with Microsoft" busy={busy === 'microsoft'} disabled={!!busy} onClick={() => finish('microsoft')} />
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
          <div className="h-px flex-1 bg-rule" /> or <div className="h-px flex-1 bg-rule" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            finish('email', email.trim())
          }}
          className="space-y-2.5"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field py-2.5"
            aria-label="Email address"
          />
          <button className="btn-primary w-full justify-center py-2.5" disabled={!!busy}>
            {busy === 'email' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            Continue with email
          </button>
        </form>

        <p className="mt-8 text-center text-xs leading-relaxed text-ink-faint">
          Demo sign-in: no account is created and nothing leaves this browser.
        </p>
      </div>
    </div>
  )
}

function ProviderButton(props: { icon: ReactNode; label: string; busy: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-rule bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-faint hover:bg-paper disabled:opacity-60"
    >
      {props.busy ? <Loader2 size={18} className="animate-spin text-ink-soft" /> : props.icon}
      {props.label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="#111">
      <path d="M16.37 12.73c-.03-2.6 2.13-3.86 2.22-3.92-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.95-3.94.95-.82 0-2.07-.93-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.46 7.8 1.3 10.36.87 1.25 1.9 2.65 3.25 2.6 1.3-.05 1.8-.84 3.38-.84 1.57 0 2.02.84 3.4.81 1.4-.02 2.3-1.27 3.15-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.05-2.75-4.14zM13.78 5.1c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.29.69-3.03 1.56-.66.77-1.25 2-1.09 3.18 1.15.09 2.33-.58 3.05-1.45z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  )
}
