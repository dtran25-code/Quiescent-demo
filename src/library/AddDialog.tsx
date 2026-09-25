import { useRef, useState, type DragEvent } from 'react'
import { FileUp, Link2, Loader2 } from 'lucide-react'
import { Modal } from '../components/Modal'
import { addItem, newId } from '../storage/db'
import { readPdf } from '../ingest/pdf'
import { articleFromHtml, articleFromText } from '../ingest/article'

type Tab = 'pdf' | 'link'

export function AddDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('pdf')
  return (
    <Modal title="Add to library" onClose={onClose} width="max-w-lg">
      <div className="mb-5 flex gap-1 rounded-lg bg-paper-deep p-1 text-sm">
        <TabButton active={tab === 'pdf'} onClick={() => setTab('pdf')} icon={<FileUp size={15} />} label="Upload PDF" />
        <TabButton active={tab === 'link'} onClick={() => setTab('link')} icon={<Link2 size={15} />} label="Article link" />
      </div>
      {tab === 'pdf' ? <PdfUpload onDone={onClose} /> : <LinkForm onDone={onClose} />}
    </Modal>
  )
}

function TabButton(props: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={props.onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors ${
        props.active ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {props.icon} {props.label}
    </button>
  )
}

// --- PDF upload ------------------------------------------------------------

function PdfUpload({ onDone }: { onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(file: File | undefined) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const pdf = await readPdf(file, file.name)
      await addItem(
        {
          id: newId(),
          title: pdf.title,
          type: 'pdf',
          fileName: file.name,
          addedAt: Date.now(),
          progress: 0,
          chapters: pdf.chapters,
          pageCount: pdf.pageCount,
        },
        file,
      )
      onDone()
    } catch {
      setError("Couldn't read that PDF. It may be damaged or password-protected.")
      setBusy(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handle(e.dataTransfer.files[0])
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={busy}
        className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? 'border-accent bg-accent-soft' : 'border-rule hover:border-ink-faint'
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin text-accent" size={26} />
            <p className="mt-3 text-sm text-ink-soft">Reading PDF and finding chapters…</p>
          </>
        ) : (
          <>
            <FileUp className="text-ink-faint" size={26} strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium">Drop a PDF here, or click to choose</p>
            <p className="mt-1 text-xs text-ink-faint">Chapters come from the PDF's table of contents when it has one</p>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
    </div>
  )
}

// --- Article link ------------------------------------------------------------

function LinkForm({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  async function save(article: ReturnType<typeof articleFromText>) {
    await addItem({
      id: newId(),
      title: article.title,
      type: 'article',
      sourceUrl: url.trim() || undefined,
      addedAt: Date.now(),
      progress: 0,
      chapters: article.chapters,
      blocks: article.blocks,
    })
    onDone()
  }

  async function fetchArticle(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json().catch(() => ({ error: 'The link helper is only available while running locally.' }))
      if (!res.ok || data.error) throw new Error(data.error ?? 'Unknown error')
      const article = articleFromHtml(data.html, data.title)
      // Readability's title is usually better than the first heading on the page.
      await save({ ...article, title: data.title || article.title })
    } catch (err) {
      setFetchError((err as Error).message)
      setPasteMode(true)
      setBusy(false)
    }
  }

  async function savePasted(e: React.FormEvent) {
    e.preventDefault()
    const fallback = title.trim() || url.trim() || 'Untitled article'
    const body = title.trim() ? `# ${title.trim()}\n\n${text}` : text
    await save(articleFromText(body, fallback))
  }

  return (
    <div className="space-y-5">
      <form onSubmit={fetchArticle} className="flex gap-2">
        <input
          type="url"
          required={!pasteMode}
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="field"
          autoFocus
        />
        {!pasteMode && (
          <button className="btn-primary shrink-0" disabled={busy || !url.trim()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? 'Fetching…' : 'Fetch article'}
          </button>
        )}
      </form>

      {!pasteMode ? (
        <button onClick={() => setPasteMode(true)} className="text-sm text-ink-soft underline-offset-2 hover:underline">
          Or paste the article text instead
        </button>
      ) : (
        <form onSubmit={savePasted} className="space-y-3">
          {fetchError && (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">
              {fetchError} Paste the article text below instead.
            </p>
          )}
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field"
          />
          <textarea
            required
            rows={8}
            placeholder={'Paste the article text here.\n\nTip: start a line with "## " to mark a section heading.'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="field resize-y font-serif leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            {!fetchError && (
              <button type="button" onClick={() => setPasteMode(false)} className="btn-ghost">
                Back
              </button>
            )}
            <button className="btn-primary" disabled={!text.trim()}>
              Add article
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
