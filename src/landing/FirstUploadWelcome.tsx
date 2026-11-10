// After the landing page upload trial (user story A), in the Library:
//   1. "First successful upload! Congrats!" pop-up (or "Added to Read later" if the
//      library already had readings, e.g. a returning user who used the trial)
//   2. then, once per browser, the tip "Add Quiescent to Chrome to save articles in one click."
//      with "Add to Chrome" and "Not now". Skipped when the extension is already connected.
// /library?welcome=upload opens it for /screens (uses the sample PDF).

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { PartyPopper, Puzzle, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { DevNote } from '../dev/DevNote'
import { track } from '../events/track'
import { setStatus } from '../proto/actions'
import { useProto } from '../proto/store'
import { TESTER_BUILD } from '../proto/build'
import { openChromeStore } from './chromeStore'
import type { FirstUploadState } from './LandingPage'

const TIP_KEY = 'quiescent.v2.installTipSeen'

function tipSeen() {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return false
  }
}
function markTipSeen() {
  try {
    localStorage.setItem(TIP_KEY, '1')
  } catch {
    // Showing the tip again is harmless.
  }
}

export function FirstUploadWelcome() {
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const extensionConnected = useProto((s) => s.extensionConnected)
  const [upload] = useState<FirstUploadState['firstUpload'] | null>(() => {
    const fromState = (location.state as FirstUploadState | null)?.firstUpload
    if (fromState) return fromState
    if (params.get('welcome') === 'upload') return { itemId: 'sample-wealth', title: 'The Wealth of Nations', first: true }
    return null
  })
  const [step, setStep] = useState<'congrats' | 'tip' | null>(upload ? 'congrats' : null)

  // Don't show it again on refresh or Back.
  useEffect(() => {
    if (!upload) return
    track('first_upload_celebrated', { item_id: upload.itemId }, 'web')
    if (params.has('welcome')) {
      params.delete('welcome')
      setParams(params, { replace: true, state: null })
    } else navigate(location.pathname + location.search, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!upload || !step) return null

  const nextAfterCongrats = () => setStep(!tipSeen() && !extensionConnected && !TESTER_BUILD ? 'tip' : null)

  if (step === 'congrats')
    return (
      <Modal title={upload.first ? 'First successful upload! Congrats!' : 'Added to Read later'} onClose={nextAfterCongrats}>
        <div className="flex items-start gap-3">
          <PartyPopper size={26} className="mt-0.5 shrink-0 text-ok" />
          <div className="min-w-0">
            <p className="line-clamp-2 font-serif text-lg font-semibold">{upload.title}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {upload.first ? "Your first reading is in your library, in Read later." : 'It is in your library, in Read later.'}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={nextAfterCongrats}>
            Done
          </button>
          <button
            className="btn-primary"
            data-autofocus
            onClick={() => {
              track('read_now_clicked', { item_id: upload.itemId, from: 'upload' })
              setStatus(upload.itemId, 'in_progress', 'read_now')
              navigate(`/read/${upload.itemId}`, { state: { entry: 'read_now' } })
            }}
          >
            Read now
          </button>
        </div>
        <DevNote className="mt-4">
          Landing user story A. Shown once, right after the upload trial. "First successful upload" only when the library was empty
          before; otherwise "Added to Read later". Then the one-time Add to Chrome tip.
        </DevNote>
      </Modal>
    )

  const answer = (choice: 'add_to_chrome' | 'not_now') => {
    track('install_tip_answered', { choice }, 'web')
    markTipSeen()
    setStep(null)
    if (choice === 'add_to_chrome') {
      track('extension_install_clicked', { from: 'first_upload_tip' }, 'web')
      openChromeStore()
    }
  }
  return (
    <div
      role="dialog"
      aria-label="Tip"
      className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-xl border border-rule bg-card p-4 shadow-xl"
    >
      <Puzzle size={20} className="mt-0.5 shrink-0 text-accent" />
      <div className="flex-1">
        <p className="text-sm font-medium">Add Quiescent to Chrome to save articles in one click.</p>
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" autoFocus onClick={() => answer('add_to_chrome')}>
            Add to Chrome
          </button>
          <button className="btn-ghost" onClick={() => answer('not_now')}>
            Not now
          </button>
        </div>
      </div>
      <button className="icon-btn -mr-1 -mt-1 h-8 w-8" aria-label="Not now" onClick={() => answer('not_now')}>
        <X size={16} />
      </button>
    </div>
  )
}
