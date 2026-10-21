// Sign-in building blocks shared by the website (/signin) and the simulated
// extension popup, so both surfaces show the same states and exact PRD copy.

import { useEffect, useId, useState } from 'react'
import { Clock, Loader2, Mail, AlertCircle } from 'lucide-react'
import { DevNote } from '../dev/DevNote'

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path style={{ fill: 'var(--color-google-yellow)' }} d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path style={{ fill: 'var(--color-google-red)' }} d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path style={{ fill: 'var(--color-google-green)' }} d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path style={{ fill: 'var(--color-google-blue)' }} d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

/** "Continue with Google" + "or" + Email field with "Send link" + "New here?…" */
export function SignInOptions({
  onGoogle,
  onSendLink,
  defaultEmail = '',
  busy,
  compact = false,
}: {
  onGoogle: () => void
  onSendLink: (email: string) => void
  defaultEmail?: string
  busy?: 'google' | 'email' | null
  compact?: boolean
}) {
  const [email, setEmail] = useState(defaultEmail)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <button
        type="button"
        onClick={onGoogle}
        disabled={!!busy}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink-soft/40 bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-soft disabled:opacity-60"
      >
        {busy === 'google' ? <Loader2 size={18} className="animate-spin text-ink-soft" /> : <GoogleIcon />}
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <div className="h-px flex-1 bg-rule" /> or <div className="h-px flex-1 bg-rule" />
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter an email address like you@example.com.')
          setError(null)
          onSendLink(email.trim())
        }}
        className="space-y-2.5"
      >
        <label htmlFor={id} className="block text-sm font-medium">
          Email
        </label>
        <input
          id={id}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field py-2.5"
          autoComplete="email"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {error && (
          <p id={`${id}-err`} role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button className="btn-primary w-full py-2.5" disabled={!!busy}>
          {busy === 'email' ? <Loader2 size={16} className="animate-spin" /> : null}
          Send link
        </button>
      </form>
      <p className="text-xs text-ink-soft">New here? Signing in creates your account.</p>
    </div>
  )
}

/** "Check your email" with the 60-second Resend rule and "Use a different email". */
export function CheckEmail({
  email,
  onResend,
  onDifferentEmail,
  onSimulateClick,
  onSimulateExpired,
  sentAt,
}: {
  email: string
  onResend: () => void
  onDifferentEmail: () => void
  onSimulateClick: () => void
  onSimulateExpired: () => void
  /** When the last link was sent (resets the 60 s wait). */
  sentAt: number
}) {
  const left = useCountdown(sentAt, 60)
  return (
    <div className="space-y-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ok-soft text-ok">
        <Mail size={20} />
      </div>
      <div>
        <h2 className="font-serif font-semibold text-2xl">Check your email</h2>
        <p className="mt-1 font-medium">{email}</p>
        <p className="mt-2 text-sm text-ink-soft">
          {left > 0
            ? 'The link should arrive within a minute. If not, check your spam folder.'
            : 'Still nothing? Check your spam folder, or resend.'}
        </p>
      </div>
      <button className="btn-secondary w-full" onClick={onResend} aria-disabled={left > 0} disabled={left > 0}>
        {left > 0 ? `Resend in ${left} s` : 'Resend'}
      </button>
      <button className="btn-link" onClick={onDifferentEmail}>
        Use a different email
      </button>
      <div className="space-y-2 rounded-lg border border-dashed border-devnote-border bg-devnote/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-devnote-ink">Prototype only</p>
        <button className="btn-primary w-full" onClick={onSimulateClick}>
          Simulate clicking the email link
        </button>
        <button className="btn-link text-xs" onClick={onSimulateExpired}>
          Simulate an expired link
        </button>
      </div>
      <DevNote>
        PRD: "Resend" is available after 60 s; max 5 links per email per hour (6th → "Try again later"); links are single-use and
        expire after 15 min.
      </DevNote>
    </div>
  )
}

export function LinkExpired({ onSendNew }: { onSendNew: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-lg bg-warn-soft px-4 py-3 text-warn" role="alert">
        <Clock size={18} />
        <h2 className="font-serif font-semibold text-xl text-ink">Link expired</h2>
      </div>
      <p className="text-sm text-ink-soft">Sign-in links work once and expire after 15 minutes.</p>
      <button className="btn-primary w-full" onClick={onSendNew} data-autofocus>
        Send a new link
      </button>
    </div>
  )
}

export function TooManyRequests({ onDifferentEmail }: { onDifferentEmail: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-lg bg-warn-soft px-4 py-3 text-warn" role="alert">
        <AlertCircle size={18} />
        <h2 className="font-serif font-semibold text-xl text-ink">Try again later</h2>
      </div>
      <p className="text-sm text-ink-soft">Too many sign-in links were sent to this address in the last hour.</p>
      <button className="btn-link" onClick={onDifferentEmail}>
        Use a different email
      </button>
      <DevNote>
        PRD copy is just "Try again later". The extension wireframe asks to say when ("in an hour"). Over 5 links per email per hour.
      </DevNote>
    </div>
  )
}

export function SigningIn() {
  return (
    <div className="flex items-center gap-3 py-6" role="status">
      <Loader2 size={20} className="animate-spin text-accent" />
      <p className="font-serif font-semibold text-xl">Signing you in…</p>
    </div>
  )
}

export function useCountdown(from: number, seconds: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  return Math.max(0, Math.ceil(seconds - (now - from) / 1000))
}
