// Account (A5), rebuilt from Prototype docs/reference/account-page.html inside the
// sidebar shell. Changes from the reference: no top nav (sidebar replaces it), no
// Date of birth, and the annotation badges only show with Dev → "Show dev notes".

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { Badge, DevNote, type BadgeKind } from '../dev/DevNote'
import { protoStore, useDev, useProto } from '../proto/store'
import { useItems } from '../storage/db'
import { signOutHere } from '../auth/auth'
import { track } from '../events/track'
import { relTime } from '../shell/AppShell'

const MAX_PHOTO_MB = 5

export function AccountPage() {
  const profile = useProto((s) => s.profile)
  const extensionConnected = useProto((s) => s.extensionConnected)
  const computers = useProto((s) => s.computersSignedIn)
  const lastSyncAt = useProto((s) => s.lastSyncAt)
  const offline = useDev((s) => s.offline)
  const items = useItems()
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 pb-16 pt-10">
      <h1 className="font-serif text-3xl">Account</h1>

      <Section title="Profile" badge="proposed">
        <ProfileEditor />
      </Section>
      <DevNote>
        Name and photo match the spec (stored from Google: name, email, photo), so they only need an editor. Date of birth was
        removed in v2: no MVP feature uses it and it adds privacy-policy and age-rule questions.
      </DevNote>

      <Section title="Sign-in" badge="proposed">
        <KV k="Email" v={profile.email} />
        <KV k="Sign-in method" v={profile.method === 'google' ? 'Google' : 'Email link'} />
        <p className="text-sm text-ink-soft">You stay signed in unless you don't use Quiescent for 30 days.</p>
      </Section>

      <Section title="Sync" badge="proposed">
        <KV k="Status" v={offline ? "Offline, changes won't save" : `Synced ${relTime(lastSyncAt)}`} />
        <KV
          k="Chrome extension"
          v={
            extensionConnected ? (
              'Connected on this computer'
            ) : (
              <span className="flex items-center gap-3">
                Not installed
                <a
                  href="/demo-browser"
                  className="btn-secondary px-3 py-1"
                  onClick={() => track('extension_install_clicked', { from: 'account' })}
                >
                  Add to Chrome
                </a>
              </span>
            )
          }
        />
        <KV k="Computers signed in" v={String(computers)} />
        <KV k="Items in library" v={items ? String(items.length) : '…'} />
      </Section>

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[15px]">Your library is kept when you sign out.</p>
          <button
            className="btn-secondary"
            onClick={async () => {
              await signOutHere('web')
              navigate('/signin?state=signed-out', { replace: true })
            }}
          >
            Sign out of this computer
          </button>
        </div>
        <DevNote>Signing out here also signs out the extension on this computer. Other computers stay signed in (PRD).</DevNote>
      </Section>

      <Section title="Delete account" badge="proposed">
        <p className="text-[15px] leading-relaxed">
          To delete your account and everything in it, email{' '}
          <a className="text-accent-dark underline underline-offset-2" href="mailto:support@quiescent.app">
            support@quiescent.app
          </a>
          .
        </p>
        <DevNote>In-app deletion is P1. Before then, requests go by email; deleted or anonymized within [30] days. Owner and SLA: open question.</DevNote>
      </Section>
    </div>
  )
}

function Section({ title, badge, children }: { title?: string; badge?: BadgeKind; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-rule bg-card p-6">
      {title && (
        <h2 className="text-lg font-semibold">
          {title}
          {badge && <Badge kind={badge} />}
        </h2>
      )}
      {children}
    </section>
  )
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3 text-[15px] last-of-type:border-0 last-of-type:pb-0">
      <span className="text-ink-soft">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  )
}

type PhotoState = { kind: 'idle' } | { kind: 'uploading' } | { kind: 'saved' } | { kind: 'error' }

function ProfileEditor() {
  const profile = useProto((s) => s.profile)
  const [name, setName] = useState(profile.name)
  const [photo, setPhoto] = useState<PhotoState>({ kind: 'idle' })
  const [nameSaved, setNameSaved] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const initial = (profile.name || profile.email || '?').trim()[0]?.toUpperCase()

  useEffect(() => setName(profile.name), [profile.name])

  async function onFile(file: File | undefined) {
    if (!file) return
    if (!/^image\/(jpeg|png)$/.test(file.type) || file.size > MAX_PHOTO_MB * 1024 * 1024) {
      track('profile_photo_changed', { action: 'rejected', bytes: file.size })
      return setPhoto({ kind: 'error' })
    }
    setPhoto({ kind: 'uploading' })
    try {
      const [url] = await Promise.all([downscale(file, 160), new Promise((r) => setTimeout(r, 800))])
      protoStore.set((s) => ({ ...s, profile: { ...s.profile, photo: url } }))
      track('profile_photo_changed', { action: 'uploaded', bytes: file.size })
      setPhoto({ kind: 'saved' })
    } catch {
      setPhoto({ kind: 'error' })
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-5">
        {profile.photo ? (
          <img src={profile.photo} alt="Your profile photo" className="h-18 w-18 rounded-full object-cover" />
        ) : (
          <div className="flex h-18 w-18 items-center justify-center rounded-full bg-moss-100 font-serif text-3xl text-moss-700" aria-hidden="true">
            {initial}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => input.current?.click()} disabled={photo.kind === 'uploading'}>
              Upload photo
            </button>
            <button
              className="btn-link px-2"
              disabled={!profile.photo}
              onClick={() => {
                protoStore.set((s) => ({ ...s, profile: { ...s.profile, photo: undefined } }))
                track('profile_photo_changed', { action: 'removed', bytes: 0 })
                setPhoto({ kind: 'idle' })
              }}
            >
              Remove
            </button>
          </div>
          <p className="text-xs text-ink-soft">
            <Badge kind="proposed" /> JPG or PNG, up to {MAX_PHOTO_MB} MB. If you signed in with Google, we use your Google photo until you upload one.
          </p>
          <input ref={input} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>
      <div aria-live="polite">
        {photo.kind === 'uploading' && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rule px-2.5 py-1 text-sm">
            <Loader2 size={14} className="animate-spin" /> Uploading…
          </span>
        )}
        {photo.kind === 'saved' && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-ok-soft px-2.5 py-1 text-sm font-semibold">
            <Check size={14} /> Saved
          </span>
        )}
        {photo.kind === 'error' && (
          <span role="alert" className="inline-flex items-center gap-1.5 rounded-md bg-warn-soft px-2.5 py-1 text-sm font-semibold">
            <AlertCircle size={14} /> Couldn't upload. Use a JPG or PNG under {MAX_PHOTO_MB} MB.
          </span>
        )}
      </div>

      <form
        className="flex max-w-md flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          protoStore.set((s) => ({ ...s, profile: { ...s.profile, name: name.trim() } }))
          track('profile_name_saved', { name_length: name.trim().length })
          setNameSaved(true)
          window.setTimeout(() => setNameSaved(false), 2500)
        }}
      >
        <label htmlFor={nameId} className="text-sm font-semibold">
          Name
        </label>
        <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="field h-11 text-[15px]" />
        <div className="mt-2 flex items-center gap-3">
          <button className="btn-primary" disabled={name.trim() === profile.name}>
            Save changes
          </button>
          {nameSaved && (
            <span role="status" className="inline-flex items-center gap-1 text-sm text-ok">
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </form>
      <DevNote>
        Upload states shown: Uploading… · ✓ Saved · "Couldn't upload. Use a JPG or PNG under 5 MB." The photo is downscaled to
        160 px in the browser for the prototype.
      </DevNote>
    </>
  )
}

function downscale(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no canvas'))
      const s = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('bad image'))
    img.src = URL.createObjectURL(file)
  })
}
