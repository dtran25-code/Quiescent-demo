import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate, useSearchParams } from 'react-router'
import { LibraryPage } from './library/LibraryPage'
import { LoginPage } from './landing/LoginPage'
import { ReaderPage } from './reader/ReaderPage'
import { AccountPage } from './account/AccountPage'
import { AppShell } from './shell/AppShell'
import { DevMenu } from './dev/DevMenu'
import { resetDemo, seedSamples } from './samples/seed'
import { useSession } from './storage/db'
import { protoStore, type UserState } from './proto/store'
import { TESTER_BUILD } from './proto/build'

// Developer pages load on demand.
const ScreensPage = lazy(() => import('./dev/ScreensPage'))
const EventsPage = lazy(() => import('./dev/EventsPage'))
const DemoBrowser = lazy(() => import('./extension/DemoBrowser'))

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    seedSamples()
      .catch((err) => console.error('Could not load sample items', err))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<LoginPage />} />
          <Route element={<SignedInOnly />}>
            <Route element={<AppShell />}>
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/library/folders/:folderId" element={<LibraryPage />} />
              <Route path="/read/:id" element={<ReaderPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Route>
          {!TESTER_BUILD && (
            <>
              <Route path="/screens" element={<ScreensPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/demo-browser" element={<DemoBrowser />} />
              <Route path="/dev/go" element={<DevGo />} />
            </>
          )}
          {/* v1 addresses: the Notes page is gone; old links land on the reader. */}
          <Route path="/notes/:id" element={<NotesRedirect />} />
          <Route path="/login" element={<Navigate to="/signin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!TESTER_BUILD && <DevMenu />}
    </BrowserRouter>
  )
}

/** Signed in → Library (the landing page after sign-in). Signed out → sign-in. */
function Home() {
  const session = useSession()
  if (session === undefined) return null
  return <Navigate to={session ? '/library' : '/signin'} replace />
}

function SignedInOnly() {
  const session = useSession()
  if (session === undefined) return null
  return session ? <Outlet /> : <Navigate to="/signin" replace />
}

function NotesRedirect() {
  const id = location.pathname.split('/').pop()
  return <Navigate to={`/read/${id}`} replace />
}

/**
 * /dev/go?state=<user state>&to=<path>: used by /screens for screens that need a
 * particular user state. Switches (resetting demo data) only if needed.
 */
function DevGo() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  useEffect(() => {
    const state = params.get('state') as UserState | null
    const to = params.get('to') ?? '/library'
    ;(async () => {
      if (state && (state !== protoStore.get().userState || params.get('fresh') === '1')) await resetDemo(state)
      navigate(to, { replace: true })
    })()
  }, [params, navigate])
  return <p className="p-10 text-sm text-ink-faint">Switching user state…</p>
}
