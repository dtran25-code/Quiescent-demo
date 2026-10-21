// Upload (MVP). DEFAULT: PDF only, up to 25 MB.
// States: picker → uploading → success (item lands in Read later) | error (wrong type / too large / unreadable).
// /screens can open any state directly with ?upload=picker|uploading|success|wrong-type|too-large.

import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from 'lucide-react'
import { Modal } from '../components/Modal'
import { Badge, DevNote } from '../dev/DevNote'
import { addItem, newId } from '../storage/db'
import { readPdf } from '../ingest/pdf'
import { registerSave, setStatus } from '../proto/actions'
import { track } from '../events/track'
import type { Item } from '../types'

export const MAX_UPLOAD_MB = 25
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export type UploadState =
  | { kind: 'picker' }
  | { kind: 'uploading'; name: string; bytes: number; pct: number }
  | { kind: 'success'; item: Pick<Item, 'id' | 'title' | 'pageCount'> }
  | { kind: 'error'; reason: 'wrong_type' | 'too_large' | 'read_error'; name: string; bytes: number }

export const DEMO_UPLOAD_STATES: Record<string, UploadState> = {
  picker: { kind: 'picker' },
  uploading: { kind: 'uploading', name: 'distributed-systems-week7.pdf', bytes: 4_200_000, pct: 62 },
  success: { kind: 'success', item: { id: 'sample-wealth', title: 'The Wealth of Nations', pageCount: 9 } },
  'wrong-type': { kind: 'error', reason: 'wrong_type', name: 'lecture-notes.docx', bytes: 880_000 },
  'too-large': { kind: 'error', reason: 'too_large', name: 'textbook-full-scan.pdf', bytes: 31_400_000 },
}

export function UploadDialog({ onClose, initial }: { onClose: () => void; initial?: UploadState }) {
  const [state, setState] = useState<UploadState>(initial ?? { kind: 'picker' })
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const navigate = useNavigate()
  const alive = useRef(true)
  useEffect(() => () => void (alive.current = false), [])

  async function handle(file: File | undefined) {
    if (!file) return
    const type = fileType(file)
    track('upload_started', { file_type: type, bytes: file.size })
    if (type !== 'pdf') return fail('wrong_type', file, type)
    if (file.size > MAX_BYTES) return fail('too_large', file, type)

    const started = performance.now()
    setState({ kind: 'uploading', name: file.name, bytes: file.size, pct: 0 })
    // Simulated transfer progress while the PDF is actually read in the browser.
    let pct = 0
    const timer = window.setInterval(() => {
      pct = Math.min(90, pct + 9)
      if (alive.current) setState((s) => (s.kind === 'uploading' ? { ...s, pct } : s))
    }, 90)
    try {
      const [pdf] = await Promise.all([readPdf(file, file.name), new Promise((r) => setTimeout(r, 900))])
      const item: Item = {
        id: newId(),
        title: pdf.title,
        type: 'pdf',
        fileName: file.name,
        addedAt: Date.now(),
        progress: 0,
        chapters: pdf.chapters,
        pageCount: pdf.pageCount,
      }
      await addItem(item, file)
      registerSave(item, 'upload')
      track('upload_completed', {
        item_id: item.id,
        file_type: 'pdf',
        bytes: file.size,
        pages: pdf.pageCount,
        text_extractable: true,
        chapters_detected: pdf.chapters.length,
        processing_ms: performance.now() - started,
      })
      if (alive.current) setState({ kind: 'success', item })
    } catch {
      fail('read_error', file, 'pdf')
    } finally {
      window.clearInterval(timer)
    }
  }

  function fail(reason: 'wrong_type' | 'too_large' | 'read_error', file: File, type: ReturnType<typeof fileType>) {
    track('upload_failed', { file_type: type, error_type: reason })
    if (alive.current) setState({ kind: 'error', reason, name: file.name, bytes: file.size })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handle(e.dataTransfer.files[0])
  }

  return (
    <Modal title="Upload a PDF" onClose={onClose} width="max-w-lg">
      {state.kind === 'picker' || state.kind === 'error' ? (
        <>
          <button
            type="button"
            data-autofocus
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? 'border-accent bg-accent-soft' : 'border-rule hover:border-ink-faint'
            }`}
          >
            <FileUp className="text-ink-faint" size={26} strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium">Drop a PDF here, or click to choose</p>
            <p className="mt-1 text-xs text-ink-faint">PDF only, up to {MAX_UPLOAD_MB} MB. It lands in Read later.</p>
          </button>
          <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
          {state.kind === 'error' && (
            <div role="alert" className="mt-4 flex gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3 text-sm text-accent-dark">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{errorTitle(state.reason)}</p>
                <p className="mt-0.5">{errorBody(state)}</p>
              </div>
            </div>
          )}
        </>
      ) : state.kind === 'uploading' ? (
        <div className="py-4" aria-live="polite">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Uploading {state.name}</p>
              <p className="text-xs text-ink-faint">{formatMb(state.bytes)} · reading pages and chapters…</p>
            </div>
            <span className="text-sm tabular-nums text-ink-soft">{state.pct}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-rule" role="progressbar" aria-valuenow={state.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${state.pct}%` }} />
          </div>
        </div>
      ) : (
        <div className="py-2" role="status">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-ok" />
            <div className="min-w-0">
              <p className="font-medium">Added to Read later</p>
              <p className="mt-1 line-clamp-2 font-serif font-semibold text-ink">{state.item.title}</p>
              {state.item.pageCount ? <p className="text-xs text-ink-faint">PDF · {state.item.pageCount} pages</p> : null}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Done
            </button>
            <button
              className="btn-primary"
              data-autofocus
              onClick={() => {
                track('read_now_clicked', { item_id: state.item.id, from: 'upload' })
                setStatus(state.item.id, 'in_progress', 'read_now')
                onClose()
                navigate(`/read/${state.item.id}`, { state: { entry: 'read_now' } })
              }}
            >
              Read now
            </button>
          </div>
        </div>
      )}
      <DevNote className="mt-4">
        DEFAULT: PDF only, ≤ {MAX_UPLOAD_MB} MB (PRD proposes PDF + EPUB up to 100 MB). Size and type are checked before
        upload starts. Success lands in Read later; "Read now" moves it to In progress. <Badge kind="needs decision" />
      </DevNote>
    </Modal>
  )
}

function fileType(file: File): 'pdf' | 'epub' | 'docx' | 'other' {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.epub')) return 'epub'
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx'
  return 'other'
}

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function errorTitle(reason: 'wrong_type' | 'too_large' | 'read_error') {
  return reason === 'wrong_type' ? 'PDF only for now' : reason === 'too_large' ? 'That file is too large' : "Couldn't read that PDF"
}

function errorBody(s: Extract<UploadState, { kind: 'error' }>) {
  if (s.reason === 'wrong_type') return `“${s.name}” isn't a PDF. Choose a .pdf file.`
  if (s.reason === 'too_large') return `“${s.name}” is ${formatMb(s.bytes)}. The limit is ${MAX_UPLOAD_MB} MB.`
  return `“${s.name}” may be damaged or password-protected. Nothing was added.`
}
