// Web sign-in (A6). Mirrors the extension popup's sign-in states, with the PRD's exact copy.
//   /signin                      Continue with Google · email + Send link
//   /signin?state=check-email    Check your email (Resend after 60 s, Use a different email)
//   /signin?state=signing-in     Signing you in…
//   /signin?state=expired        Link expired → Send a new link
//   /signin?state=rate-limited   Try again later (over 5 links an hour)
//   /signin?state=signed-out     Sign in + "Signed out on this computer. Your library is kept."
// MOCKUP ONLY: every path "signs in" instantly. No account or identity provider exists.

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Logo } from '../components/Logo'
import { CheckEmail, LinkExpired, SignInOptions, SigningIn, TooManyRequests } from '../auth/SignInParts'
import { completeSignIn } from '../auth/auth'
import { DevNote } from '../dev/DevNote'
import { devStore } from '../proto/store'
import { track } from '../events/track'

type State = 'start' | 'check-email' | 'signing-in' | 'expired' | 'rate-limited' | 'signed-out'
const STATES: State[] = ['start', 'check-email', 'signing-in', 'expired', 'rate-limited', 'signed-out']

export function LoginPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const raw = params.get('state') as State | null
  const state: State = raw && STATES.includes(raw) ? raw : 'start'
  const [email, setEmail] = useState(params.get('email') ?? 'tam@usf.edu')
  const [sentAt, setSentAt] = useState(() => Date.now())
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)

  const go = (next: State) => setParams(next === 'start' ? {} : { state: next }, { replace: false })

  useEffect(() => {
    if (state === 'start' || state === 'signed-out') track('sign_in_prompt_shown', { trigger: 'website' }, 'web')
  }, [state])

  async function finish(provider: 'google' | 'email', withEmail?: string) {
    setBusy(provider)
    go('signing-in')
    await new Promise((r) => setTimeout(r, 900))
    await completeSignIn(provider, withEmail, 'web')
    navigate('/library', { replace: true })
  }

  function sendLink(address: string) {
    track('sign_in_started', { provider: 'email' }, 'web')
    setEmail(address)
    if (devStore.get().rateLimited) {
      track('sign_in_failed', { reason: 'rate_limited' }, 'web')
      return go('rate-limited')
    }
    setSentAt(Date.now())
    go('check-email')
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-paper px-8 py-16">
      <Logo />
      <div className="mt-10 w-full max-w-sm rounded-2xl border border-rule bg-card p-7 shadow-sm">
        {state === 'signed-out' && (
          <p role="status" className="mb-5 rounded-lg bg-ok-soft px-3.5 py-2.5 text-sm text-ink">
            Signed out on this computer. Your library is kept.
          </p>
        )}
        {(state === 'start' || state === 'signed-out') && (
          <>
            <h1 className="mb-5 font-serif font-semibold text-2xl">Sign in to Quiescent</h1>
            <SignInOptions
              busy={busy}
              defaultEmail=""
              onGoogle={() => {
                track('sign_in_started', { provider: 'google' }, 'web')
                finish('google')
              }}
              onSendLink={sendLink}
            />
          </>
        )}
        {state === 'check-email' && (
          <CheckEmail
            email={email}
            sentAt={sentAt}
            onResend={() => {
              track('sign_in_link_resent', { reason: 'resend' }, 'web')
              if (devStore.get().rateLimited) return go('rate-limited')
              setSentAt(Date.now())
            }}
            onDifferentEmail={() => go('start')}
            onSimulateClick={() => finish('email', email)}
            onSimulateExpired={() => {
              track('sign_in_failed', { reason: 'link_expired' }, 'web')
              go('expired')
            }}
          />
        )}
        {state === 'signing-in' && <SigningIn />}
        {state === 'expired' && (
          <LinkExpired
            onSendNew={() => {
              track('sign_in_link_resent', { reason: 'expired' }, 'web')
              setSentAt(Date.now())
              go('check-email')
            }}
          />
        )}
        {state === 'rate-limited' && <TooManyRequests onDifferentEmail={() => go('start')} />}
      </div>
      <DevNote className="mt-6 max-w-sm">
        Sign-in is simulated. Google succeeds instantly; the email link is clicked with the "Simulate…" button. The first
        sign-in creates the account (no separate sign-up). Dev → "Too many requests" makes Send link show "Try again later".
      </DevNote>
    </div>
  )
}
