import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { LibraryPage } from './library/LibraryPage'
import { LandingPage } from './landing/LandingPage'
import { LoginPage } from './landing/LoginPage'
import { ReaderPage } from './reader/ReaderPage'
import { seedSamples } from './samples/seed'
import { useItem, useSession } from './storage/db'

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
      <Routes>
        <Route element={<SignedOutOnly />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<SignedInOnly />}>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/read/:id" element={<ReaderPage />} />
          <Route path="/notes/:id" element={<ComingSoon view="Notes View" phase={3} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Mock sign-in gate: the app screens need a (fake) session; the landing and
// sign-in pages are only for signed-out visitors.
function SignedInOnly() {
  const session = useSession()
  if (session === undefined) return null
  return session ? <Outlet /> : <Navigate to="/" replace />
}
function SignedOutOnly() {
  const session = useSession()
  if (session === undefined) return null
  return session ? <Navigate to="/library" replace /> : <Outlet />
}

// Placeholder screens until later phases.
function ComingSoon({ view, phase }: { view: string; phase: number }) {
  const { id } = useParams()
  const item = useItem(id)
  return (
    <div className="mx-auto max-w-2xl px-8 py-14">
      <Link to="/library" className="btn-ghost -ml-4">
        <ArrowLeft size={16} /> Library
      </Link>
      <h1 className="mt-6 font-serif text-3xl">{item?.title ?? '…'}</h1>
      <p className="mt-3 text-ink-soft">
        The {view} arrives in Phase {phase}.
      </p>
      {item && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Detected chapters</h2>
          <ol className="mt-3 space-y-1.5 font-serif">
            {item.chapters.map((c) => (
              <li key={c.id} style={{ paddingLeft: (c.level - 1) * 18 }}>
                {c.title}
                {c.startPage && (
                  <span className="ml-2 font-sans text-xs text-ink-faint">
                    pp. {c.startPage}–{c.endPage}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
