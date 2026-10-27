// Add an article by link (Upload dialog → Link tab). The link helper
// (/api/extract: server/extractArticle.ts locally, a Netlify Function when
// deployed) downloads the page and pulls out the article. When a site blocks
// it, the reader can paste the text instead.
// DEFAULT: same rules as an extension save: lands in Read later, and a link
// already in the library isn't added twice (canonical URL match).

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, Loader2 } from 'lucide-react'
import { addItem, newId } from '../storage/db'
import { articleFromHtml, articleFromText } from '../ingest/article'
import { canonicalUrl } from '../proto/canonical'
import { registerSave } from '../proto/actions'
import { protoStore } from '../proto/store'
import { track } from '../events/track'
import { hostOf } from './useLibrary'
import type { Item } from '../types'

type Article = ReturnType<typeof articleFromText>

export function LinkForm({ onSaved }: { onSaved: (item: Item) => void }) {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  const link = url.trim()
  const domain = hostOf(link) ?? undefined

  /** Already in the library? Returns its id. */
  function existing(): string | null {
    if (!link) return null
    const canonical = canonicalUrl(link)
    const hit = Object.entries(protoStore.get().meta).find(([, m]) => m.canonicalUrl === canonical)
    return hit ? hit[0] : null
  }

  async function save(article: Article, method: 'fetched' | 'pasted', page: { siteName?: string | null; byline?: string | null } = {}) {
    const item: Item = {
      id: newId(),
      title: article.title,
      type: 'article',
      sourceUrl: link || undefined,
      siteName: page.siteName ?? undefined,
      author: page.byline ?? undefined,
      addedAt: Date.now(),
      progress: 0,
      chapters: article.chapters,
      blocks: article.blocks,
    }
    const words = article.blocks.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0)
    await addItem(item)
    registerSave(item, 'link', { canonical: link ? canonicalUrl(link) : undefined, wordCount: words })
    track('link_added', { item_id: item.id, source_domain: domain, word_count: words, method })
    onSaved(item)
  }

  function fail(message: string, errorType: 'invalid_link' | 'fetch_failed' | 'not_article') {
    track('link_add_failed', { error_type: errorType, source_domain: domain })
    setError(message)
    setPasteMode(true)
    setBusy(false)
  }

  async function fetchArticle(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setDuplicateId(null)
    if (!domain) return fail("That doesn't look like a valid link. Check it, or paste the article text below.", 'invalid_link')
    const dup = existing()
    if (dup) {
      track('link_duplicate', { item_id: dup, source_domain: domain })
      setDuplicateId(dup)
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(link)}`)
      const data = await res.json().catch(() => ({ error: "The link helper isn't available right now." }))
      if (!res.ok || data.error) {
        return fail(`${data.error ?? "Couldn't fetch that page."} Paste the article text below instead.`, res.status === 422 ? 'not_article' : 'fetch_failed')
      }
      const article = articleFromHtml(data.html, data.title)
      // Readability's title is usually better than the first heading on the page.
      await save({ ...article, title: data.title || article.title }, 'fetched', data)
    } catch {
      fail("Couldn't reach the link helper. Paste the article text below instead.", 'fetch_failed')
    }
  }

  async function savePasted(e: FormEvent) {
    e.preventDefault()
    const dup = existing()
    if (dup) {
      track('link_duplicate', { item_id: dup, source_domain: domain })
      setDuplicateId(dup)
      return
    }
    const fallback = title.trim() || domain || 'Untitled article'
    const body = title.trim() ? `# ${title.trim()}\n\n${text}` : text
    await save(articleFromText(body, fallback), 'pasted')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={fetchArticle} className="flex gap-2">
        <input
          type="url"
          required={!pasteMode}
          aria-label="Article link"
          placeholder="https://…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setDuplicateId(null)
          }}
          className="field"
          data-autofocus
        />
        {!pasteMode && (
          <button className="btn-primary shrink-0" disabled={busy || !link}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? 'Fetching…' : 'Add'}
          </button>
        )}
      </form>
      <p className="text-xs text-ink-faint">Paste a link to an article. It lands in Read later.</p>

      {duplicateId && (
        <div role="status" className="flex items-center gap-3 rounded-lg bg-paper-deep px-3.5 py-3 text-sm">
          <p className="flex-1">Already in your library.</p>
          <button className="btn-secondary px-3 py-1" onClick={() => navigate(`/read/${duplicateId}`)}>
            Open it
          </button>
        </div>
      )}

      {!pasteMode ? (
        <button type="button" onClick={() => setPasteMode(true)} className="text-sm text-ink-soft underline-offset-2 hover:underline">
          Or paste the article text instead
        </button>
      ) : (
        <form onSubmit={savePasted} className="space-y-3">
          {error && (
            <div role="alert" className="flex gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3 text-sm text-accent-dark">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <input placeholder="Title (optional)" aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="field" />
          <textarea
            required
            rows={7}
            aria-label="Article text"
            placeholder={'Paste the article text here.\n\nTip: start a line with "## " to mark a section heading.'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="field resize-y font-serif leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            {!error && (
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
