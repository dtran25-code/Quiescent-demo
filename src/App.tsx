import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { LibraryPage } from './library/LibraryPage'
import { LandingPage } from './landing/LandingPage'
import { LoginPage } from './landing/LoginPage'
import { ReaderPage } from './reader/ReaderPage'
import { NotesPage } from './notes/NotesPage'
import { seedSamples, upgradeSavedItems } from './samples/seed'
import { useSession } from './storage/db'

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    seedSamples()
      .then(upgradeSavedItems)
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
          <Route path="/notes/:id" element={<NotesPage />} />
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
