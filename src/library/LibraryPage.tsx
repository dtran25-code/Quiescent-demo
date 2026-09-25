import { useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, FileText, Newspaper, PenLine, Plus, Trash2 } from 'lucide-react'
import { addItem, deleteItem, signOut, useItems } from '../storage/db'
import { Logo } from '../components/Logo'
import type { Item } from '../types'
import { ConfirmDialog } from '../components/Modal'
import { AddDialog } from './AddDialog'

export function LibraryPage() {
  const items = useItems()
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<Item | null>(null)

  return (
    <div className="mx-auto max-w-3xl px-8 py-14">
      <header className="flex items-end justify-between border-b border-rule pb-6">
        <div>
          <h1>
            <Logo />
          </h1>
          <p className="mt-2 text-sm text-ink-soft">Your reading notebook</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => signOut()}>
            Sign out
          </button>
          <button className="btn-primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add to library
          </button>
        </div>
      </header>

      {items === undefined ? (
        <p className="py-16 text-center text-sm text-ink-faint">Loading your library…</p>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-serif text-xl">Your library is empty.</p>
          <p className="mt-2 text-sm text-ink-soft">Add a PDF or an article link to start reading.</p>
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {items.map((item) => (
            <LibraryRow key={item.id} item={item} onDelete={() => setToDelete(item)} />
          ))}
        </ul>
      )}

      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onReady={async (item, file) => {
            await addItem(item, file)
            setAdding(false)
          }}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Remove from library?"
          message={
            <>
              <span className="font-medium text-ink">{toDelete.title}</span> and all of its highlights and notes will be
              deleted. This can't be undone.
            </>
          }
          confirmLabel="Remove"
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deleteItem(toDelete.id)
            setToDelete(null)
          }}
        />
      )}
    </div>
  )
}

function LibraryRow({ item, onDelete }: { item: Item; onDelete: () => void }) {
  const TypeIcon = item.type === 'pdf' ? FileText : Newspaper
  const source =
    item.type === 'pdf' ? `PDF · ${item.pageCount} pages` : `Article · ${hostOf(item.sourceUrl) ?? 'pasted text'}`
  const progress = Math.round(item.progress)

  return (
    <li className="group flex items-center gap-5 py-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-paper-deep text-ink-soft">
        <TypeIcon size={20} strokeWidth={1.6} />
      </div>

      <div className="min-w-0 flex-1">
        <Link to={`/read/${item.id}`} className="block truncate font-serif text-lg leading-snug hover:text-accent">
          {item.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-ink-faint">
          {source} · {item.chapters.length} {item.chapters.length === 1 ? 'section' : 'sections'} · added{' '}
          {new Date(item.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
        <div className="mt-2.5 flex items-center gap-3">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-rule"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Reading progress"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-9 text-right text-xs tabular-nums text-ink-faint">{progress}%</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link to={`/read/${item.id}`} className="icon-btn" title="Read" aria-label={`Read ${item.title}`}>
          <BookOpen size={19} strokeWidth={1.7} />
        </Link>
        <Link to={`/notes/${item.id}`} className="icon-btn" title="Notes" aria-label={`Notes for ${item.title}`}>
          <PenLine size={19} strokeWidth={1.7} />
        </Link>
        <button
          onClick={onDelete}
          className="icon-btn opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          title="Remove from library"
          aria-label={`Remove ${item.title}`}
        >
          <Trash2 size={17} strokeWidth={1.7} />
        </button>
      </div>
    </li>
  )
}

function hostOf(url?: string) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
