// Mock sign-in shared by the website and the simulated extension.
// PRD: the website and extension share one sign-in on a computer; signing out on
// either signs out both (on that computer only).
// MOCKUP ONLY: there is no identity provider, password or account behind this.

import { signIn, signOut, getItems } from '../storage/db'
import { identify, track } from '../events/track'
import { protoStore } from '../proto/store'
import type { Surface } from '../events/dictionary'

export async function completeSignIn(provider: 'google' | 'email', email: string | undefined, surface: Surface) {
  const isNew = protoStore.get().userState === 'new' && protoStore.get().profile.name === ''
  await signIn(provider, email)
  identify(`user_${(email ?? 'google').replace(/[^A-Za-z0-9]/g, '').slice(0, 24) || 'demo'}`)
  if (email) protoStore.set((s) => ({ ...s, profile: { ...s.profile, email, method: provider } }))
  else protoStore.set((s) => ({ ...s, profile: { ...s.profile, method: provider } }))
  track('sign_in_completed', { provider, account: isNew ? 'new' : 'returning' }, surface)
  if (!isNew && firstSignInOnThisComputer()) track('new_device_sign_in', { items_available: (await getItems()).length }, 'web')
}

function firstSignInOnThisComputer() {
  try {
    if (localStorage.getItem('quiescent.v2.device')) return false
    localStorage.setItem('quiescent.v2.device', '1')
    return true
  } catch {
    return false
  }
}

export async function signOutHere(surface: Surface) {
  track('signed_out', {}, surface)
  identify(null)
  await signOut()
}
